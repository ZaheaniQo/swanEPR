-- Ensure secure invoice/journal RPCs bypass RLS after tenant + role checks

create or replace function public.create_journal_entry_secure(p_entry jsonb, p_lines jsonb) returns jsonb
language plpgsql security definer
set search_path = public, auth, app
set row_security = off
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
set row_security = off
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
set row_security = off
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
set row_security = off
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
