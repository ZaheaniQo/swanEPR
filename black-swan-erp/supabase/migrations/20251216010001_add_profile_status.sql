-- Align profiles with app logic: add status and approval metadata, tenant scoping, sane defaults
alter table public.profiles
  add column if not exists status text default 'PENDING',
  add column if not exists tenant_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Make role default to a non-pending value (use PARTNER as minimal role)
alter table public.profiles alter column role set default 'PARTNER';

-- Backfill existing rows
update public.profiles
  set status = coalesce(status, 'ACTIVE')
  where status is null;

-- Optional: backfill tenant_id with id if missing (single-tenant fallback)
update public.profiles
  set tenant_id = id
  where tenant_id is null;

-- Indexes for lookups
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_profiles_status on public.profiles(status);