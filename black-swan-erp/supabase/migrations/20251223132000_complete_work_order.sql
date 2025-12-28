-- Atomic, idempotent work order completion

alter table public.work_orders
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id),
  add column if not exists completion_notes text;

create table if not exists public.work_order_completion_requests (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  tenant_id uuid not null,
  idempotency_key text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_work_order_completion_idempotency
  on public.work_order_completion_requests(tenant_id, work_order_id, idempotency_key);
create index if not exists idx_work_order_completion_work_order
  on public.work_order_completion_requests(work_order_id);

alter table public.work_order_completion_requests enable row level security;

drop policy if exists work_order_completion_select on public.work_order_completion_requests;
create policy work_order_completion_select on public.work_order_completion_requests
for select using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

create or replace function public.complete_work_order(
  p_work_order_id uuid,
  p_completed_at timestamptz,
  p_notes text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, app
set row_security = off
as $$
declare
  v_tenant uuid := app.current_tenant_id();
  v_existing jsonb;
  v_work_order record;
  v_qty numeric;
  v_movement_ids uuid[] := '{}';
  v_movement_id uuid;
  v_stock_id uuid;
  v_current_qty numeric;
  v_component_cost numeric;
  v_finish_cost numeric;
  v_total numeric := 0;
  v_journal_id uuid;
  v_acc_inventory uuid;
  v_acc_cogs uuid;
  v_now timestamptz := coalesce(p_completed_at, now());
  v_item record;
begin
  if v_tenant is null then
    raise exception 'tenant_id claim is required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key is required';
  end if;
  if not public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER']) then
    raise exception 'insufficient privileges';
  end if;

  select result
    into v_existing
    from public.work_order_completion_requests
   where tenant_id = v_tenant
     and work_order_id = p_work_order_id
     and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;

  select *
    into v_work_order
    from public.work_orders
   where id = p_work_order_id
     and tenant_id = v_tenant
   for update;
  if not found then
    raise exception 'Work order % not found for tenant', p_work_order_id;
  end if;

  if v_work_order.status = 'COMPLETED' then
    v_existing := jsonb_build_object(
      'work_order_id', v_work_order.id,
      'status', v_work_order.status,
      'already_completed', true,
      'completed_at', v_work_order.completed_at
    );
    insert into public.work_order_completion_requests(work_order_id, tenant_id, idempotency_key, result)
    values (v_work_order.id, v_tenant, p_idempotency_key, v_existing);
    return v_existing;
  end if;

  if v_work_order.warehouse_id is null then
    raise exception 'Work order % has no warehouse', v_work_order.id;
  end if;

  v_qty := coalesce(nullif(v_work_order.quantity_produced, 0), v_work_order.quantity_planned);
  if v_qty is null or v_qty <= 0 then
    raise exception 'Work order % has invalid quantity', v_work_order.id;
  end if;

  update public.work_orders
     set status = 'COMPLETED',
         completed_at = v_now,
         completed_by = auth.uid(),
         completion_notes = p_notes,
         quantity_produced = v_qty
   where id = v_work_order.id;

  select *
    into v_work_order
    from public.work_orders
   where id = v_work_order.id;

  if v_work_order.bom_id is not null then
    for v_item in
      select component_product_id, quantity
        from public.bom_items
       where bom_id = v_work_order.bom_id
         and tenant_id = v_tenant
    loop
      select id, quantity
        into v_stock_id, v_current_qty
        from public.inventory_stock
       where product_id = v_item.component_product_id
         and warehouse_id = v_work_order.warehouse_id
         and tenant_id = v_tenant
       for update;

      if v_stock_id is null then
        raise exception 'Missing stock for component %', v_item.component_product_id;
      end if;

      if (v_current_qty - (v_item.quantity * v_qty)) < 0 then
        raise exception 'Insufficient stock for component %', v_item.component_product_id;
      end if;

      update public.inventory_stock
         set quantity = quantity - (v_item.quantity * v_qty)
       where id = v_stock_id
         and tenant_id = v_tenant;

      select avg_cost
        into v_component_cost
        from public.products
       where id = v_item.component_product_id
         and tenant_id = v_tenant;
      v_component_cost := coalesce(v_component_cost, 0);

      insert into public.inventory_movements(
        product_id, warehouse_id, type, quantity, unit_cost,
        reference_type, reference_id, date, user_id, notes, tenant_id
      ) values (
        v_item.component_product_id,
        v_work_order.warehouse_id,
        'ISSUE',
        (v_item.quantity * v_qty),
        v_component_cost,
        'WORK_ORDER',
        v_work_order.id,
        v_now,
        auth.uid(),
        coalesce(p_notes, 'Work order consumption'),
        v_tenant
      )
      returning id into v_movement_id;
      v_movement_ids := array_append(v_movement_ids, v_movement_id);
    end loop;
  end if;

  select id, quantity
    into v_stock_id, v_current_qty
    from public.inventory_stock
   where product_id = v_work_order.product_id
     and warehouse_id = v_work_order.warehouse_id
     and tenant_id = v_tenant
   for update;

  if v_stock_id is null then
    insert into public.inventory_stock(product_id, warehouse_id, quantity, tenant_id)
    values (v_work_order.product_id, v_work_order.warehouse_id, 0, v_tenant)
    returning id, quantity into v_stock_id, v_current_qty;
  end if;

  update public.inventory_stock
     set quantity = quantity + v_qty
   where id = v_stock_id
     and tenant_id = v_tenant;

  select avg_cost
    into v_finish_cost
    from public.products
   where id = v_work_order.product_id
     and tenant_id = v_tenant;
  v_finish_cost := coalesce(v_finish_cost, 0);
  v_total := v_finish_cost * v_qty;

  insert into public.inventory_movements(
    product_id, warehouse_id, type, quantity, unit_cost,
    reference_type, reference_id, date, user_id, notes, tenant_id
  ) values (
    v_work_order.product_id,
    v_work_order.warehouse_id,
    'RECEIPT',
    v_qty,
    v_finish_cost,
    'WORK_ORDER',
    v_work_order.id,
    v_now,
    auth.uid(),
    coalesce(p_notes, 'Work order completion'),
    v_tenant
  )
  returning id into v_movement_id;
  v_movement_ids := array_append(v_movement_ids, v_movement_id);

  if v_total > 0 then
    select id into v_acc_inventory
      from public.coa_accounts
     where code = '1200'
       and tenant_id = v_tenant;
    select id into v_acc_cogs
      from public.coa_accounts
     where code = '5000'
       and tenant_id = v_tenant;

    if v_acc_inventory is null or v_acc_cogs is null then
      raise exception 'Missing accounts for work order posting (1200, 5000)';
    end if;

    insert into public.journal_entries(
      entry_number, date, reference, description, status, created_by, tenant_id
    ) values (
      concat('WO-', v_work_order.number, '-', to_char(v_now, 'YYYYMMDDHH24MISS')),
      v_now,
      v_work_order.number,
      concat('Work order completion ', v_work_order.number),
      'POSTED',
      auth.uid(),
      v_tenant
    ) returning id into v_journal_id;

    insert into public.journal_lines(journal_id, account_id, description, debit, credit, tenant_id)
    values
      (v_journal_id, v_acc_inventory, 'Finished goods receipt', v_total, 0, v_tenant),
      (v_journal_id, v_acc_cogs, 'Work order completion', 0, v_total, v_tenant);

    perform app.ensure_journal_balanced_entry(v_journal_id);
  end if;

  insert into public.audit_logs(table_name, record_id, operation, new_data, changed_by, tenant_id)
  values ('work_orders', v_work_order.id, 'COMPLETE', row_to_json(v_work_order), auth.uid(), v_tenant);

  v_existing := jsonb_build_object(
    'work_order_id', v_work_order.id,
    'status', 'COMPLETED',
    'journal_entry_id', v_journal_id,
    'inventory_movement_ids', v_movement_ids,
    'total_value', v_total,
    'completed_at', v_now
  );

  insert into public.work_order_completion_requests(work_order_id, tenant_id, idempotency_key, result)
  values (v_work_order.id, v_tenant, p_idempotency_key, v_existing);

  return v_existing;
exception when unique_violation then
  select result
    into v_existing
    from public.work_order_completion_requests
   where tenant_id = v_tenant
     and work_order_id = p_work_order_id
     and idempotency_key = p_idempotency_key;
  return v_existing;
end;
$$;
