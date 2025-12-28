-- Consolidated guardrails for invoices & journals with tenant claim shim
set check_function_bodies = off;
select set_config('request.jwt.claims', '{"tenant_id":"00000000-0000-0000-0000-000000000000"}', true);

-- Audit table alignment (legacy-safe)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text,
  action text,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  tenant_id uuid,
  created_at timestamptz default now(),
  record_id uuid,
  operation text
);
alter table if exists public.audit_logs add column if not exists table_name text;
alter table if exists public.audit_logs add column if not exists action text;
alter table if exists public.audit_logs add column if not exists old_data jsonb;
alter table if exists public.audit_logs add column if not exists new_data jsonb;
alter table if exists public.audit_logs add column if not exists user_id uuid;
alter table if exists public.audit_logs add column if not exists tenant_id uuid;
alter table if exists public.audit_logs add column if not exists created_at timestamptz default now();
alter table if exists public.audit_logs add column if not exists record_id uuid;
alter table if exists public.audit_logs alter column record_id drop not null;
alter table if exists public.audit_logs add column if not exists operation text;
alter table if exists public.audit_logs alter column operation drop not null;

-- Helpers
create schema if not exists app;
create or replace function app.current_tenant_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
$$ language sql stable;
create or replace function app.current_user_id() returns uuid as $$ select auth.uid(); $$ language sql stable;

-- Balance enforcement
create or replace function app.ensure_journal_balanced(p_entry_id uuid) returns void as $$
declare total_debit numeric; total_credit numeric; begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into total_debit, total_credit from public.journal_lines where journal_id = p_entry_id;
  if total_debit <> total_credit then
    raise exception 'Journal entry % is not balanced (debit %, credit %)', p_entry_id, total_debit, total_credit;
  end if; end; $$ language plpgsql;
create or replace function app.assert_balanced_journal() returns trigger as $$ begin
  perform app.ensure_journal_balanced(coalesce(new.journal_id, old.journal_id));
  return coalesce(new, old); end; $$ language plpgsql;
drop trigger if exists journal_lines_balance on public.journal_lines;
create trigger journal_lines_balance after insert or update or delete on public.journal_lines for each row execute function app.assert_balanced_journal();

-- Posted immutability
create or replace function app.prevent_posted_journal_mutation() returns trigger as $$ begin
  if old.status = 'POSTED' then raise exception 'Posted journal entries are read-only'; end if; return old; end; $$ language plpgsql;
drop trigger if exists prevent_posted_journal_update on public.journal_entries;
create trigger prevent_posted_journal_update before update or delete on public.journal_entries for each row execute function app.prevent_posted_journal_mutation();

create or replace function app.prevent_posted_invoice_mutation() returns trigger as $$ begin
  if old.status = 'POSTED' then raise exception 'Posted invoices are read-only'; end if; return old; end; $$ language plpgsql;
drop trigger if exists prevent_posted_invoice_update on public.invoices;
create trigger prevent_posted_invoice_update before update or delete on public.invoices for each row execute function app.prevent_posted_invoice_mutation();

-- Secure journal entry creation
create or replace function public.create_journal_entry_secure(p_entry jsonb, p_lines jsonb) returns jsonb as $$
declare tenant uuid := app.current_tenant_id(); new_id uuid; begin
  if tenant is null then raise exception 'tenant_id is required via JWT'; end if;
  insert into public.journal_entries(id, entry_number, date, description, reference, status, tenant_id, created_by)
  values (gen_random_uuid(), coalesce(p_entry->>'entry_number', 'JE-' || extract(epoch from now())::bigint), coalesce((p_entry->>'date')::timestamptz, now()), p_entry->>'description', p_entry->>'reference', coalesce(p_entry->>'status','DRAFT'), tenant, app.current_user_id())
  returning id into new_id;

  insert into public.journal_lines(id, journal_id, account_id, cost_center_id, description, debit, credit, tenant_id)
  select gen_random_uuid(), new_id, (line->>'account_id')::uuid, nullif(line->>'cost_center_id','')::uuid, line->>'description', coalesce((line->>'debit')::numeric,0), coalesce((line->>'credit')::numeric,0), tenant
  from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) line;

  perform app.ensure_journal_balanced(new_id);
  return jsonb_build_object('id', new_id);
end; $$ language plpgsql security definer;

-- Invoice posting creates balanced journal
create or replace function public.post_invoice_secure(p_invoice_id uuid) returns void as $$
declare inv record; tenant uuid := app.current_tenant_id(); je_id uuid; begin
  select * into inv from public.invoices where id = p_invoice_id and tenant_id = tenant for update;
  if not found then raise exception 'Invoice % not found for tenant', p_invoice_id; end if;
  if inv.status <> 'APPROVED' then raise exception 'Only APPROVED invoices can be posted'; end if;

  je_id := (
    select (public.create_journal_entry_secure(
      jsonb_build_object('entry_number','JE-'||to_char(now(),'YYYYMMDDHH24MISS'), 'date', coalesce(inv.issue_date, now()), 'description', 'Invoice '||inv.invoice_number, 'reference', inv.invoice_number, 'status','POSTED'),
      jsonb_build_array(
        jsonb_build_object('account_id',(select id from public.coa_accounts where code = '1100' and tenant_id = tenant),'description','Accounts Receivable','debit',inv.total_amount,'credit',0),
        jsonb_build_object('account_id',(select id from public.coa_accounts where code = '2100' and tenant_id = tenant),'description','VAT Payable','debit',0,'credit',inv.vat_amount),
        jsonb_build_object('account_id',(select id from public.coa_accounts where code = '4000' and tenant_id = tenant),'description','Revenue','debit',0,'credit',inv.subtotal)
      )
    )->>'id')::uuid
  );

  update public.invoices set status = 'POSTED', posting_meta = jsonb_build_object('journal_entry_id', je_id, 'posted_at', now(), 'posted_by', app.current_user_id()) where id = p_invoice_id and tenant_id = tenant;
end; $$ language plpgsql security definer;

-- RLS enablement and policies
alter table if exists public.invoices enable row level security;
alter table if exists public.invoice_items enable row level security;
alter table if exists public.journal_entries enable row level security;
alter table if exists public.journal_lines enable row level security;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select using (tenant_id = app.current_tenant_id());
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete using (false);

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select using (tenant_id = app.current_tenant_id());
drop policy if exists invoice_items_insert on public.invoice_items;
create policy invoice_items_insert on public.invoice_items for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists invoice_items_update on public.invoice_items;
create policy invoice_items_update on public.invoice_items for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists invoice_items_delete on public.invoice_items;
create policy invoice_items_delete on public.invoice_items for delete using (false);

drop policy if exists journal_entries_select on public.journal_entries;
create policy journal_entries_select on public.journal_entries for select using (tenant_id = app.current_tenant_id());
drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists journal_entries_delete on public.journal_entries;
create policy journal_entries_delete on public.journal_entries for delete using (false);

drop policy if exists journal_lines_select on public.journal_lines;
create policy journal_lines_select on public.journal_lines for select using (tenant_id = app.current_tenant_id());
drop policy if exists journal_lines_insert on public.journal_lines;
create policy journal_lines_insert on public.journal_lines for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists journal_lines_update on public.journal_lines;
create policy journal_lines_update on public.journal_lines for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists journal_lines_delete on public.journal_lines;
create policy journal_lines_delete on public.journal_lines for delete using (false);
