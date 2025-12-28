-- Zero-trust tenant isolation + RBAC hardening
set check_function_bodies = off;

create schema if not exists app;

-- Strict tenant source of truth: JWT claim only
create or replace function app.current_tenant_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
$$;

create or replace function public.current_tenant_id() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

create or replace function public.current_tenant() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

create or replace function public.get_current_tenant_id() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

-- Unassigned tenant placeholder for legacy backfill
create or replace function app.unassigned_tenant_id() returns uuid
language sql immutable
as $$
  select '00000000-0000-0000-0000-000000000000'::uuid;
$$;

-- Tenant-aware role checks (membership required)
create or replace function public.has_role(role_name text) returns boolean
language sql stable
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and r.name = role_name
  );
$$;

create or replace function public.has_any_role(role_names text[]) returns boolean
language sql stable
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and r.name = any(role_names)
  );
$$;

create or replace function public.has_permission(user_id uuid, required_permission text)
returns boolean
language sql stable security definer
set search_path = public, auth, app
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
      join public.role_permissions rp on ur.role_id = rp.role_id
      join public.permissions p on rp.permission_id = p.id
     where ur.user_id = has_permission.user_id
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and p.code = required_permission
  );
$$;

-- Profiles: add mutable name fields for self-service updates
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.profiles alter column role drop default;
alter table public.profiles alter column status set default 'PENDING';

-- Signup handler: no tenant/role assignment; pending only
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, auth, app
as $$
begin
  insert into public.profiles (id, email, status, tenant_id)
  values (new.id, new.email, 'PENDING', app.unassigned_tenant_id());
  return new;
end;
$$;

-- Tenant defaults + NOT NULL for tenant-scoped tables
DO $$
declare
  t text;
  tables text[] := ARRAY[
    'settings','coa_accounts','customers','suppliers','employees','contracts','products','quotations',
    'invoices','receipts','disbursements','projects','inventory_movements','work_orders','journal_entries',
    'product_sizes','contract_items','contract_milestones','quotation_items','invoice_items','journal_lines',
    'project_stages','bom_items','approvals','salary_structures','leaves','payroll_runs','payslips',
    'assets','asset_categories','asset_depreciation_schedules','bill_of_materials','inventory_stock',
    'warehouses','cost_centers','orders','order_items','partners','equity_transactions','capital_events','audit_logs'
  ];
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('tenant_id', app.unassigned_tenant_id())::text,
    true
  );

  foreach t in array tables loop
    begin
      if t = 'invoices' then
        begin
          execute 'alter table public.invoices disable trigger prevent_posted_invoice_update';
        exception when undefined_object then
          raise notice 'Invoice protection trigger not found, skipping disable';
        end;
      end if;

      if t = 'audit_logs' then
        begin
          execute 'alter table public.audit_logs disable trigger no_audit_log_changes';
        exception when undefined_object then
          raise notice 'Audit log immutability trigger not found, skipping disable';
        end;
      end if;

      execute format('update %I set tenant_id = app.unassigned_tenant_id() where tenant_id is null', t);
      execute format('alter table %I alter column tenant_id set default app.current_tenant_id()', t);
      execute format('alter table %I alter column tenant_id set not null', t);

      if t = 'invoices' then
        begin
          execute 'alter table public.invoices enable trigger prevent_posted_invoice_update';
        exception when undefined_object then
          raise notice 'Invoice protection trigger not found, skipping enable';
        end;
      end if;

      if t = 'audit_logs' then
        begin
          execute 'alter table public.audit_logs enable trigger no_audit_log_changes';
        exception when undefined_object then
          raise notice 'Audit log immutability trigger not found, skipping enable';
        end;
      end if;
    exception when undefined_table then
      raise notice 'Table % does not exist, skipping tenant defaults', t;
    end;
  end loop;
end;
$$;

-- Profiles tenant_id default only (allow pending users without tenant assignment)
alter table public.profiles alter column tenant_id set default app.current_tenant_id();

-- Audit log normalization
DO $$
begin
  begin
    execute 'alter table public.audit_logs disable trigger no_audit_log_changes';
  exception when undefined_object then
    raise notice 'Audit log immutability trigger not found, skipping disable';
  end;

  alter table public.audit_logs add column if not exists user_id uuid;
  alter table public.audit_logs add column if not exists created_at timestamptz default now();
  update public.audit_logs set user_id = coalesce(user_id, changed_by) where user_id is null and changed_by is not null;

  begin
    execute 'alter table public.audit_logs enable trigger no_audit_log_changes';
  exception when undefined_object then
    raise notice 'Audit log immutability trigger not found, skipping enable';
  end;
end;
$$;

-- Profile RLS: self access with restricted updates, admins can manage
alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select using (
  public.has_any_role(array['SUPER_ADMIN','CEO'])
  and tenant_id = app.current_tenant_id()
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update using (
  public.has_any_role(array['SUPER_ADMIN','CEO'])
  and tenant_id = app.current_tenant_id()
)
with check (
  public.has_any_role(array['SUPER_ADMIN','CEO'])
  and tenant_id = app.current_tenant_id()
);

create or replace function app.enforce_profile_mutable_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or public.has_any_role(array['SUPER_ADMIN','CEO']) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.status is distinct from old.status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.email is distinct from old.email
     or new.full_name is distinct from old.full_name then
    raise exception 'Profile updates are restricted to first_name, last_name, and avatar_url';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_mutable_fields on public.profiles;
create trigger enforce_profile_mutable_fields
before update on public.profiles
for each row execute function app.enforce_profile_mutable_fields();

-- Remove legacy tenant-only policies that bypass RBAC
DO $$
declare
  t text;
  tables text[] := ARRAY[
    'settings','coa_accounts','customers','suppliers','employees','contracts','products','quotations',
    'invoices','receipts','disbursements','projects','inventory_movements','work_orders','journal_entries',
    'product_sizes','contract_items','contract_milestones','quotation_items','invoice_items','journal_lines',
    'project_stages','bom_items','approvals','salary_structures','leaves','payroll_runs','payslips',
    'assets','asset_categories','asset_depreciation_schedules','bill_of_materials','inventory_stock',
    'warehouses','cost_centers','orders','order_items','partners','equity_transactions','capital_events','audit_logs'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('drop policy if exists "tenant_select_strict" on %I', t);
      execute format('drop policy if exists "tenant_insert_strict" on %I', t);
      execute format('drop policy if exists "tenant_update_strict" on %I', t);
      execute format('drop policy if exists "tenant_delete_strict" on %I', t);
      execute format('drop policy if exists "Tenant Isolation Select" on %I', t);
      execute format('drop policy if exists "Tenant Isolation Insert" on %I', t);
      execute format('drop policy if exists "Tenant Isolation Update" on %I', t);
      execute format('drop policy if exists "Tenant Isolation Delete" on %I', t);
      execute format('drop policy if exists "Employees Select tenant or null" on %I', t);
      execute format('drop policy if exists "Employees Insert tenant only" on %I', t);
      execute format('drop policy if exists "Employees Update tenant or null" on %I', t);
      execute format('drop policy if exists "Employees Delete tenant or null" on %I', t);
      execute format('drop policy if exists "Salary structures Select tenant or null" on %I', t);
      execute format('drop policy if exists "Salary structures Insert tenant only" on %I', t);
      execute format('drop policy if exists "Salary structures Update tenant or null" on %I', t);
      execute format('drop policy if exists "Salary structures Delete tenant or null" on %I', t);
      execute format('drop policy if exists "Payroll Select tenant or null" on %I', t);
      execute format('drop policy if exists "Payroll Insert tenant only" on %I', t);
      execute format('drop policy if exists "Payroll Update tenant" on %I', t);
      execute format('drop policy if exists "Payroll Delete tenant" on %I', t);
      execute format('drop policy if exists "Payslips Select tenant or null" on %I', t);
      execute format('drop policy if exists "Payslips Insert tenant only" on %I', t);
      execute format('drop policy if exists "Payslips Update tenant" on %I', t);
      execute format('drop policy if exists "Payslips Delete tenant" on %I', t);
    exception when undefined_table then
      raise notice 'Table % does not exist, skipping policy cleanup', t;
    end;
  end loop;
end;
$$;

-- Orders RLS aligned to JWT tenant and RBAC
alter table public.orders enable row level security;

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
for insert with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
for update using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
for delete using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

alter table public.order_items enable row level security;

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
for select using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
for insert with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items
for update using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items
for delete using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

-- Warehouses and cost centers RBAC
alter table public.warehouses enable row level security;

drop policy if exists warehouses_select on public.warehouses;
create policy warehouses_select on public.warehouses
for select using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

drop policy if exists warehouses_insert on public.warehouses;
create policy warehouses_insert on public.warehouses
for insert with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

drop policy if exists warehouses_update on public.warehouses;
create policy warehouses_update on public.warehouses
for update using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

drop policy if exists warehouses_delete on public.warehouses;
create policy warehouses_delete on public.warehouses
for delete using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

alter table public.cost_centers enable row level security;

drop policy if exists cost_centers_select on public.cost_centers;
create policy cost_centers_select on public.cost_centers
for select using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists cost_centers_insert on public.cost_centers;
create policy cost_centers_insert on public.cost_centers
for insert with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists cost_centers_update on public.cost_centers;
create policy cost_centers_update on public.cost_centers
for update using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists cost_centers_delete on public.cost_centers;
create policy cost_centers_delete on public.cost_centers
for delete using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

-- Roles/permissions: admin-only read, service-role writes
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists roles_admin_select on public.roles;
create policy roles_admin_select on public.roles
for select using (public.has_any_role(array['SUPER_ADMIN','CEO']));
drop policy if exists roles_service_write on public.roles;
create policy roles_service_write on public.roles
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists permissions_admin_select on public.permissions;
create policy permissions_admin_select on public.permissions
for select using (public.has_any_role(array['SUPER_ADMIN','CEO']));
drop policy if exists permissions_service_write on public.permissions;
create policy permissions_service_write on public.permissions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists role_permissions_admin_select on public.role_permissions;
create policy role_permissions_admin_select on public.role_permissions
for select using (public.has_any_role(array['SUPER_ADMIN','CEO']));
drop policy if exists role_permissions_service_write on public.role_permissions;
create policy role_permissions_service_write on public.role_permissions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Accounting safety: enforce balance and status transitions
update public.journal_entries set status = 'VOID' where status = 'VOIDED';
DO $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'journal_entries_status_check'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_status_check
      check (status in ('DRAFT','POSTED','VOID'));
  end if;
end;
$$;

create or replace function app.ensure_journal_balanced_entry(p_journal_id uuid) returns void
language plpgsql
as $$
declare total_debit numeric; total_credit numeric; begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into total_debit, total_credit
    from public.journal_lines where journal_id = p_journal_id;
  if total_debit <> total_credit then
    raise exception 'Journal entry % is not balanced (debit %, credit %)', p_journal_id, total_debit, total_credit;
  end if;
end;
$$;

create or replace function app.assert_balanced_journal() returns trigger
language plpgsql
as $$
begin
  perform app.ensure_journal_balanced_entry(coalesce(new.journal_id, old.journal_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists journal_lines_balance on public.journal_lines;
create trigger journal_lines_balance
after insert or update or delete on public.journal_lines
for each row execute function app.assert_balanced_journal();

create or replace function app.enforce_journal_status_transition() returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'DRAFT' and new.status in ('POSTED','VOID') then
    return new;
  end if;

  if old.status = 'POSTED' and new.status = 'VOID' then
    return new;
  end if;

  raise exception 'Invalid journal status transition: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists enforce_journal_status_transition on public.journal_entries;
create trigger enforce_journal_status_transition
before update of status on public.journal_entries
for each row execute function app.enforce_journal_status_transition();

-- Invoice status normalization
update public.invoices set status = 'VOID' where status = 'VOIDED';
alter table public.invoices
  add column if not exists posting_meta jsonb;
DO $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'invoices_status_check'
  ) then
    alter table public.invoices
      add constraint invoices_status_check
      check (status in ('DRAFT','APPROVED','POSTED','VOID'));
  end if;
end;
$$;

-- Secure invoice/journal RPCs aligned to schema
create or replace function public.create_journal_entry_secure(p_entry jsonb, p_lines jsonb) returns jsonb
language plpgsql security definer
set search_path = public, auth, app
as $$
declare tenant uuid := app.current_tenant_id(); new_id uuid; begin
  if tenant is null then raise exception 'tenant_id is required via JWT'; end if;
  if not public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING']) then
    raise exception 'insufficient privileges';
  end if;

  insert into public.journal_entries(id, entry_number, date, description, reference, status, tenant_id, created_by)
  values (gen_random_uuid(), coalesce(p_entry->>'entry_number', 'JE-' || extract(epoch from now())::bigint), coalesce((p_entry->>'date')::timestamptz, now()), p_entry->>'description', p_entry->>'reference', coalesce(p_entry->>'status','DRAFT'), tenant, auth.uid())
  returning id into new_id;

  insert into public.journal_lines(id, journal_id, account_id, cost_center_id, description, debit, credit, tenant_id)
  select gen_random_uuid(), new_id, (line->>'account_id')::uuid, nullif(line->>'cost_center_id','')::uuid, line->>'description', coalesce((line->>'debit')::numeric,0), coalesce((line->>'credit')::numeric,0), tenant
  from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) line;

  perform app.ensure_journal_balanced_entry(new_id);
  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.create_invoice_secure(p_invoice jsonb, p_items jsonb) returns jsonb
language plpgsql security definer
set search_path = public, auth, app
as $$
declare tenant uuid := app.current_tenant_id(); new_id uuid; begin
  if tenant is null then raise exception 'tenant_id is required via JWT'; end if;
  if not public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING']) then
    raise exception 'insufficient privileges';
  end if;

  insert into public.invoices(
    invoice_number, type, customer_id, buyer, currency, issue_date, due_date,
    status, subtotal, vat_amount, total_amount, tenant_id, created_by
  ) values (
    coalesce(p_invoice->>'invoice_number', 'INV-' || extract(epoch from now())::bigint),
    p_invoice->>'type',
    nullif(p_invoice->>'customer_id','')::uuid,
    p_invoice->'buyer',
    coalesce(p_invoice->>'currency','SAR'),
    coalesce((p_invoice->>'issue_date')::timestamptz, now()),
    (p_invoice->>'due_date')::date,
    coalesce(p_invoice->>'status','DRAFT'),
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'vat_amount')::numeric,
    (p_invoice->>'total_amount')::numeric,
    tenant,
    auth.uid()
  ) returning id into new_id;

  insert into public.invoice_items(id, invoice_id, description, quantity, unit_price, vat_rate, tenant_id)
  select gen_random_uuid(), new_id, line->>'description', (line->>'quantity')::numeric, (line->>'unit_price')::numeric, (line->>'vat_rate')::numeric, tenant
  from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) line;

  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.set_invoice_status_secure(p_invoice_id uuid, p_status text) returns void
language plpgsql security definer
set search_path = public, auth, app
as $$
declare tenant uuid := app.current_tenant_id(); begin
  if tenant is null then raise exception 'tenant_id is required via JWT'; end if;
  if not public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING']) then
    raise exception 'insufficient privileges';
  end if;
  update public.invoices set status = p_status where id = p_invoice_id and tenant_id = tenant;
end;
$$;

create or replace function public.post_invoice_secure(p_invoice_id uuid) returns void
language plpgsql security definer
set search_path = public, auth, app
as $$
declare inv record; tenant uuid := app.current_tenant_id(); je_id uuid; begin
  if tenant is null then raise exception 'tenant_id is required via JWT'; end if;
  if not public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING']) then
    raise exception 'insufficient privileges';
  end if;

  select * into inv from public.invoices where id = p_invoice_id and tenant_id = tenant for update;
  if not found then raise exception 'Invoice % not found for tenant', p_invoice_id; end if;
  if inv.status <> 'APPROVED' then raise exception 'Only APPROVED invoices can be posted'; end if;

  je_id := (
    select (public.create_journal_entry_secure(
      jsonb_build_object('entry_number','JE-'||to_char(now(),'YYYYMMDDHH24MISS'), 'date', coalesce(inv.issue_date, now()), 'description', 'Invoice '||inv.invoice_number, 'reference', inv.invoice_number, 'status','POSTED'),
      jsonb_build_array(
        jsonb_build_object('account_id', (select id from public.coa_accounts where code = '1100' and tenant_id = tenant), 'description','Accounts Receivable','debit',inv.total_amount,'credit',0),
        jsonb_build_object('account_id', (select id from public.coa_accounts where code = '2100' and tenant_id = tenant), 'description','VAT Payable','debit',0,'credit',inv.vat_amount),
        jsonb_build_object('account_id', (select id from public.coa_accounts where code = '4000' and tenant_id = tenant), 'description','Revenue','debit',0,'credit',inv.subtotal)
      )
    )->>'id')::uuid
  );

  update public.invoices
     set status = 'POSTED',
         posting_meta = jsonb_build_object('journal_entry_id', je_id, 'posted_at', now(), 'posted_by', auth.uid())
   where id = p_invoice_id and tenant_id = tenant;
end;
$$;
