-- Align profiles defaults with latest app logic: ACTIVE status by default and tenant scoping
alter table public.profiles
  add column if not exists status text default 'ACTIVE',
  add column if not exists tenant_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Default role to PARTNER (minimal app role)
alter table public.profiles alter column role set default 'PARTNER';
-- Default status to ACTIVE for existing records
update public.profiles set status = 'ACTIVE' where status is null or status = 'PENDING';
-- Backfill tenant_id with self id as single-tenant fallback
update public.profiles set tenant_id = coalesce(tenant_id, id) where tenant_id is null;

-- Indexes used by app filters
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);

-- Ensure employee operational columns exist
alter table public.employees add column if not exists avatar_url text;
alter table public.employees add column if not exists admin_notes text;
alter table public.employees add column if not exists disabled boolean default false;
create index if not exists idx_employees_disabled on public.employees(disabled);