-- Partners audit timeline + constraints + sanity checks
set local search_path to public;

-- Constraints: enforce tenant_id, positivity, and self-transfer prevention
alter table if exists public.partners
  alter column tenant_id set not null;

alter table if exists public.equity_transactions
  alter column tenant_id set not null,
  alter column shares set not null,
  alter column price_per_share set not null,
  alter column valuation set not null;

alter table if exists public.capital_events
  alter column tenant_id set not null,
  alter column amount set not null,
  alter column valuation set not null;

alter table if exists public.equity_transactions
  drop constraint if exists equity_transactions_positive_shares,
  add constraint equity_transactions_positive_shares check (shares > 0),
  drop constraint if exists equity_transactions_not_self,
  add constraint equity_transactions_not_self check (coalesce(from_partner_id,'00000000-0000-0000-0000-000000000000') <> coalesce(to_partner_id,'11111111-1111-1111-1111-111111111111')),
  drop constraint if exists equity_transactions_positive_valuation,
  add constraint equity_transactions_positive_valuation check (valuation >= 0),
  drop constraint if exists equity_transactions_positive_price,
  add constraint equity_transactions_positive_price check (price_per_share >= 0);

alter table if exists public.capital_events
  drop constraint if exists capital_events_positive_amount,
  add constraint capital_events_positive_amount check (amount > 0),
  drop constraint if exists capital_events_positive_valuation,
  add constraint capital_events_positive_valuation check (valuation >= 0);

-- Prevent deleting partners that have transactions
alter table if exists public.equity_transactions
  drop constraint if exists equity_transactions_from_fk;
alter table if exists public.equity_transactions
  add constraint equity_transactions_from_fk foreign key (from_partner_id) references public.partners(id) on delete restrict;
alter table if exists public.equity_transactions
  drop constraint if exists equity_transactions_to_fk;
alter table if exists public.equity_transactions
  add constraint equity_transactions_to_fk foreign key (to_partner_id) references public.partners(id) on delete restrict;

-- Unique active partner per profile per tenant (partial unique index)
drop index if exists ux_partner_active_profile_per_tenant;
create unique index ux_partner_active_profile_per_tenant on public.partners(profile_id, tenant_id) where status = 'ACTIVE';

-- Useful indexes
create index if not exists idx_equity_transactions_tenant_created on public.equity_transactions(tenant_id, created_at desc);
create index if not exists idx_capital_events_tenant_created on public.capital_events(tenant_id, created_at desc);
create index if not exists idx_partners_tenant_status on public.partners(tenant_id, status);

-- Sanity check functions
create or replace function app.assert_equity_transaction_sane() returns trigger as $$
declare
    total_shares numeric(20,4);
    from_shares numeric(20,4);
    to_shares numeric(20,4);
    new_total numeric(20,4);
    tenant uuid := coalesce(new.tenant_id, app.current_tenant_id());
begin
    select coalesce(sum(delta),0) into total_shares from (
        select shares as delta from public.equity_transactions where tenant_id = tenant and transaction_type in ('ISSUE','TRANSFER')
        union all
        select -shares as delta from public.equity_transactions where tenant_id = tenant and transaction_type in ('TRANSFER','BUYBACK')
    ) s;

    if new.transaction_type = 'ISSUE' then
        new_total := total_shares + new.shares;
    elsif new.transaction_type = 'BUYBACK' then
        -- ensure partner has enough
        if new.from_partner_id is not null then
            select coalesce(sum(delta),0) into from_shares from (
                select shares as delta from public.equity_transactions where tenant_id = tenant and to_partner_id = new.from_partner_id and transaction_type in ('ISSUE','TRANSFER')
                union all
                select -shares as delta from public.equity_transactions where tenant_id = tenant and from_partner_id = new.from_partner_id and transaction_type in ('TRANSFER','BUYBACK')
            ) s2;
            if from_shares < new.shares then
                raise exception 'Buyback exceeds partner shares';
            end if;
        end if;
        new_total := total_shares - new.shares;
    elsif new.transaction_type = 'TRANSFER' then
        if new.from_partner_id is not null then
            select coalesce(sum(delta),0) into from_shares from (
                select shares as delta from public.equity_transactions where tenant_id = tenant and to_partner_id = new.from_partner_id and transaction_type in ('ISSUE','TRANSFER')
                union all
                select -shares as delta from public.equity_transactions where tenant_id = tenant and from_partner_id = new.from_partner_id and transaction_type in ('TRANSFER','BUYBACK')
            ) s3;
            if from_shares < new.shares then
                raise exception 'Transfer exceeds available shares';
            end if;
        end if;
        new_total := total_shares; -- transfers do not change total
    end if;

    if coalesce(new_total,0) < 0 then
        raise exception 'Total shares cannot be negative';
    end if;

    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_equity_sanity on public.equity_transactions;
create trigger trg_equity_sanity
before insert on public.equity_transactions
for each row execute function app.assert_equity_transaction_sane();

-- Capital sanity: prevent decrease beyond valuation proxy
create or replace function app.assert_capital_event_sane() returns trigger as $$
begin
    if new.event_type = 'DECREASE' and new.amount > new.valuation then
        raise exception 'Capital decrease exceeds valuation';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_capital_sanity on public.capital_events;
create trigger trg_capital_sanity
before insert on public.capital_events
for each row execute function app.assert_capital_event_sane();

-- Partner audit timeline view
create or replace view public.view_partner_audit_timeline as
select
    et.created_at as event_time,
    'EQUITY'::text as event_type,
    concat('Equity ', et.transaction_type, ' ', et.shares, ' @ ', et.price_per_share) as description,
    'equity_transaction'::text as reference_type,
    et.id as reference_id,
    et.created_by as performed_by,
    ap.status as approval_status,
    et.tenant_id,
    coalesce(et.to_partner_id, et.from_partner_id) as partner_id
from public.equity_transactions et
left join public.approvals ap on ap.target_id = et.id and ap.target_type = 'equity_transaction' and ap.tenant_id = et.tenant_id

union all
select
    ce.created_at,
    'CAPITAL'::text,
    concat('Capital ', ce.event_type, ' ', ce.amount, ' @ ', ce.valuation) as description,
    'capital_event',
    ce.id,
    ce.created_by,
    ap.status,
    ce.tenant_id,
    null::uuid as partner_id
from public.capital_events ce
left join public.approvals ap on ap.target_id = ce.id and ap.target_type = 'capital_event' and ap.tenant_id = ce.tenant_id

union all
select
    a.created_at,
    'APPROVAL'::text,
    concat('Approval ', a.status, ' for ', coalesce(a.target_type,'?')),
    a.target_type,
    a.target_id,
    a.decision_by,
    a.status,
    a.tenant_id,
    null::uuid as partner_id
from public.approvals a

union all
select
    al.created_at,
    'AUDIT'::text,
    concat('Audit ', al.operation, ' on ', coalesce(al.table_name,'?')),
    al.table_name,
    al.record_id,
    al.user_id,
    null::text as approval_status,
    al.tenant_id,
    null::uuid as partner_id
from public.audit_logs al;

-- RLS alignment: rely on existing table policies; view inherits via underlying policies.
