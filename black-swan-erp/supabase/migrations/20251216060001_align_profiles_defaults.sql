-- Align profiles defaults with latest app logic: PENDING status by default and admin-managed tenant assignment
alter table public.profiles
  add column if not exists status text default 'PENDING',
  add column if not exists tenant_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Roles are assigned by admins only
alter table public.profiles alter column role drop default;

-- Indexes used by app filters
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);

-- Ensure employee operational columns exist
alter table public.employees add column if not exists avatar_url text;
alter table public.employees add column if not exists admin_notes text;
alter table public.employees add column if not exists disabled boolean default false;
create index if not exists idx_employees_disabled on public.employees(disabled);
