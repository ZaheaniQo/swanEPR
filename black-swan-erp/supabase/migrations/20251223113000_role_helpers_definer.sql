-- Ensure role helper functions bypass RLS safely inside policies

create or replace function public.has_role(role_name text) returns boolean
language sql stable security definer
set search_path = public, auth, app
set row_security = off
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and r.name = role_name
  );
$$;

create or replace function public.has_any_role(role_names text[]) returns boolean
language sql stable security definer
set search_path = public, auth, app
set row_security = off
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
     where ur.user_id = auth.uid()
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and r.name = any(role_names)
  );
$$;

create or replace function public.has_permission(user_id uuid, required_permission text)
returns boolean
language sql stable security definer
set search_path = public, auth, app
set row_security = off
as $$
  select exists (
    select 1
      from public.user_roles ur
      join public.user_tenants ut
        on ut.user_id = ur.user_id
       and ut.tenant_id = ur.tenant_id
      join public.role_permissions rp on ur.role_id = rp.role_id
      join public.permissions p on rp.permission_id = p.id
     where ur.user_id = has_permission.user_id
       and ur.tenant_id = app.current_tenant_id()
       and ut.status = 'ACTIVE'
       and p.code = required_permission
  );
$$;
