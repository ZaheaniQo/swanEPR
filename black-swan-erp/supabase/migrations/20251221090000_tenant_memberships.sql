-- Create tenant membership mapping and align user_roles to be tenant-scoped

-- Profiles are created without tenant assignment; tenant mapping is admin-managed

-- Tenant memberships (server-managed)
create table if not exists public.user_tenants (
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  status text not null default 'ACTIVE',
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, tenant_id)
);

create index if not exists idx_user_tenants_tenant on public.user_tenants(tenant_id);
create index if not exists idx_user_tenants_status on public.user_tenants(status);

alter table public.user_tenants enable row level security;

drop trigger if exists set_timestamp_user_tenants on public.user_tenants;
create trigger set_timestamp_user_tenants
before update on public.user_tenants
for each row execute function handle_updated_at();

drop policy if exists "user_tenants_select_self" on public.user_tenants;
create policy "user_tenants_select_self" on public.user_tenants
for select using (auth.uid() = user_id);

drop policy if exists "user_tenants_write_service" on public.user_tenants;
create policy "user_tenants_write_service" on public.user_tenants
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Backfill memberships from profiles (default unassigned tenant for nulls)
insert into public.user_tenants (user_id, tenant_id, status, is_default)
select p.id, coalesce(p.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(p.status, 'ACTIVE'), false
from public.profiles p
on conflict (user_id, tenant_id) do nothing;

-- Ensure one default tenant per user (pick an ACTIVE row when available)
with ranked as (
  select user_id, tenant_id,
         row_number() over (
           partition by user_id
           order by (status = 'ACTIVE') desc, tenant_id
         ) as rn
  from public.user_tenants
)
update public.user_tenants ut
set is_default = (r.rn = 1)
from ranked r
where ut.user_id = r.user_id and ut.tenant_id = r.tenant_id;

-- Tenant-scope user_roles
alter table public.user_roles add column if not exists tenant_id uuid;
alter table public.user_roles add column if not exists created_at timestamptz default now();

update public.user_roles ur
set tenant_id = coalesce(p.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
from public.profiles p
where p.id = ur.user_id and ur.tenant_id is null;

alter table public.user_roles alter column tenant_id set not null;

alter table public.user_roles drop constraint if exists user_roles_pkey;
alter table public.user_roles add primary key (user_id, role_id, tenant_id);

create unique index if not exists ux_user_roles_user_role_tenant
  on public.user_roles(user_id, role_id, tenant_id);
create index if not exists idx_user_roles_tenant on public.user_roles(tenant_id);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
