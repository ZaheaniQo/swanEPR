-- Auth helpers: current tenant & role resolution (JWT tenant claim only)
set check_function_bodies = off;

create schema if not exists app;

create or replace function app.unassigned_tenant_id() returns uuid as $$
  select '00000000-0000-0000-0000-000000000000'::uuid;
$$ language sql immutable;

create or replace function app.current_tenant() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
$$ language sql stable;

create or replace function app.current_tenant_id() returns uuid as $$
  select app.current_tenant();
$$ language sql stable;

create or replace function public.current_tenant() returns uuid as $$
  select app.current_tenant();
$$ language sql stable;

create or replace function public.has_role(role_name text) returns boolean as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant()
       and ut.status = 'ACTIVE'
       and r.name = role_name
  );
$$ language sql stable;

create or replace function public.has_any_role(role_names text[]) returns boolean as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant()
       and ut.status = 'ACTIVE'
       and r.name = any(role_names)
  );
$$ language sql stable;

-- Replace legacy tenant helpers
create or replace function get_current_tenant_id() returns uuid as $$
begin
  return app.current_tenant();
end;
$$ language plpgsql stable;

-- Tenant-aware permission check
create or replace function public.has_permission(user_id uuid, required_permission text)
returns boolean as $$
declare
  has_perm boolean;
begin
  select exists (
    select 1
      from public.user_roles ur
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
      join public.role_permissions rp on ur.role_id = rp.role_id
      join public.permissions p on rp.permission_id = p.id
     where ur.user_id = has_permission.user_id
       and ur.tenant_id = app.current_tenant()
       and ut.status = 'ACTIVE'
       and p.code = required_permission
  ) into has_perm;

  return has_perm;
end;
$$ language plpgsql security definer;

-- Server-side only: assign tenant/role during signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, status, tenant_id)
  values (new.id, new.email, 'PENDING', app.unassigned_tenant_id());
  return new;
end;
$$ language plpgsql security definer;
