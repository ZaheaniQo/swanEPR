-- Partners & Capital Management module
-- Creates partners, equity ledger, capital events, and analytic views

-- Partners table
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  joined_at date not null default current_date,
  exited_at date,
  tenant_id uuid not null default app.current_tenant_id()
);

alter table public.partners enable row level security;
create index if not exists idx_partners_tenant on public.partners(tenant_id);
create index if not exists idx_partners_profile on public.partners(profile_id);
create unique index if not exists idx_partners_profile_tenant on public.partners(profile_id, tenant_id);

drop policy if exists partners_select on public.partners;
create policy partners_select on public.partners for select using (tenant_id = app.current_tenant_id());
drop policy if exists partners_insert on public.partners;
create policy partners_insert on public.partners for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists partners_update on public.partners;
create policy partners_update on public.partners for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists partners_delete on public.partners;
create policy partners_delete on public.partners for delete using (tenant_id = app.current_tenant_id());

-- Equity transactions ledger
create table if not exists public.equity_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('ISSUE','TRANSFER','BUYBACK')),
  from_partner_id uuid references public.partners(id) on delete restrict,
  to_partner_id uuid references public.partners(id) on delete restrict,
  shares numeric(20,4) not null check (shares > 0),
  price_per_share numeric(20,4) not null check (price_per_share >= 0),
  valuation numeric(20,4) not null check (valuation >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  tenant_id uuid not null default app.current_tenant_id()
);

alter table public.equity_transactions enable row level security;
create index if not exists idx_equity_transactions_tenant on public.equity_transactions(tenant_id);
create index if not exists idx_equity_transactions_to_partner on public.equity_transactions(to_partner_id);
create index if not exists idx_equity_transactions_from_partner on public.equity_transactions(from_partner_id);

drop policy if exists equity_transactions_select on public.equity_transactions;
create policy equity_transactions_select on public.equity_transactions for select using (tenant_id = app.current_tenant_id());
drop policy if exists equity_transactions_insert on public.equity_transactions;
create policy equity_transactions_insert on public.equity_transactions for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists equity_transactions_update on public.equity_transactions;
create policy equity_transactions_update on public.equity_transactions for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists equity_transactions_delete on public.equity_transactions;
create policy equity_transactions_delete on public.equity_transactions for delete using (tenant_id = app.current_tenant_id());

-- Capital events (increase / decrease)
create table if not exists public.capital_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('INCREASE','DECREASE')),
  amount numeric(20,4) not null check (amount >= 0),
  valuation numeric(20,4) not null check (valuation >= 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  tenant_id uuid not null default app.current_tenant_id()
);

alter table public.capital_events enable row level security;
create index if not exists idx_capital_events_tenant on public.capital_events(tenant_id);

drop policy if exists capital_events_select on public.capital_events;
create policy capital_events_select on public.capital_events for select using (tenant_id = app.current_tenant_id());
drop policy if exists capital_events_insert on public.capital_events;
create policy capital_events_insert on public.capital_events for insert with check (tenant_id = app.current_tenant_id());
drop policy if exists capital_events_update on public.capital_events;
create policy capital_events_update on public.capital_events for update using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());
drop policy if exists capital_events_delete on public.capital_events;
create policy capital_events_delete on public.capital_events for delete using (tenant_id = app.current_tenant_id());

-- Views
set local search_path to public;

drop view if exists public.view_partner_shares;
drop view if exists public.view_total_shares;
drop view if exists public.view_net_profit;

create or replace view public.view_partner_shares as
with approved_tx as (
    select et.*
    from public.equity_transactions et
    left join public.approvals ap
      on ap.target_id = et.id
     and ap.target_type = 'equity_transaction'
     and ap.tenant_id = et.tenant_id
    where et.tenant_id = app.current_tenant_id()
      and coalesce(ap.status, 'APPROVED') = 'APPROVED'
), share_legs as (
    select to_partner_id as partner_id, shares as delta
    from approved_tx
    where transaction_type in ('ISSUE','TRANSFER') and to_partner_id is not null
    union all
    select from_partner_id as partner_id, -shares as delta
    from approved_tx
    where transaction_type in ('TRANSFER','BUYBACK') and from_partner_id is not null
)
select
    p.id as partner_id,
    p.profile_id,
    coalesce(pr.full_name, pr.email, p.id::text) as partner_name,
    p.status,
    p.joined_at,
    p.exited_at,
    coalesce(sum(share_legs.delta), 0) as shares,
    p.tenant_id
from public.partners p
left join share_legs on share_legs.partner_id = p.id
left join public.profiles pr on pr.id = p.profile_id
where p.tenant_id = app.current_tenant_id()
group by p.id, p.profile_id, partner_name, p.status, p.joined_at, p.exited_at, p.tenant_id;

create or replace view public.view_total_shares as
with approved_tx as (
    select et.*
    from public.equity_transactions et
    left join public.approvals ap
      on ap.target_id = et.id
     and ap.target_type = 'equity_transaction'
     and ap.tenant_id = et.tenant_id
    where et.tenant_id = app.current_tenant_id()
      and coalesce(ap.status, 'APPROVED') = 'APPROVED'
), share_legs as (
    select shares as delta
    from approved_tx
    where transaction_type in ('ISSUE','TRANSFER')
    union all
    select -shares as delta
    from approved_tx
    where transaction_type in ('TRANSFER','BUYBACK')
)
select app.current_tenant_id() as tenant_id, coalesce(sum(delta), 0) as total_shares
from share_legs;

create or replace view public.view_net_profit as
select
    jl.tenant_id,
    coalesce(sum(case when ca.type = 'INCOME' then (jl.credit - jl.debit) when ca.type = 'EXPENSE' then (jl.debit - jl.credit) else 0 end), 0) as net_profit,
    coalesce(sum(case when ca.type = 'INCOME' then (jl.credit - jl.debit) else 0 end), 0) as revenue,
    coalesce(sum(case when ca.type = 'EXPENSE' then (jl.debit - jl.credit) else 0 end), 0) as expenses
from public.journal_lines jl
left join public.coa_accounts ca on ca.id = jl.account_id
where jl.tenant_id = app.current_tenant_id()
group by jl.tenant_id;
