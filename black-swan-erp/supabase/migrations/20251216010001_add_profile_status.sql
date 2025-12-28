-- Align profiles with app logic: add status and approval metadata, tenant scoping, sane defaults
alter table public.profiles
  add column if not exists status text default 'PENDING',
  add column if not exists tenant_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Role defaults are assigned by admins only (no default role)
alter table public.profiles alter column role drop default;

-- Backfill existing rows
update public.profiles
  set status = coalesce(status, 'ACTIVE')
  where status is null;

-- No tenant backfill here; tenant assignment is admin-only

-- Indexes for lookups
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_profiles_status on public.profiles(status);
