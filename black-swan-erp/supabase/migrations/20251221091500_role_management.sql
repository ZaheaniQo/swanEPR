-- Role management helpers (tenant-scoped, admin-guarded)
set check_function_bodies = off;

create or replace function public.assign_user_role(
  p_user_id uuid,
  p_role_name text,
  p_tenant_id uuid
) returns void as $$
declare
  v_role_id uuid;
begin
  if app.current_tenant() is distinct from p_tenant_id then
    raise exception 'tenant mismatch';
  end if;

  if not public.has_any_role(array['SUPER_ADMIN','CEO']) then
    raise exception 'insufficient privileges';
  end if;

  select id into v_role_id from public.roles where name = p_role_name;
  if v_role_id is null then
    raise exception 'role % not found', p_role_name;
  end if;

  insert into public.user_roles (user_id, role_id, tenant_id)
  values (p_user_id, v_role_id, p_tenant_id)
  on conflict do nothing;

  update public.user_tenants
     set status = 'ACTIVE'
   where user_id = p_user_id and tenant_id = p_tenant_id;
end;
$$ language plpgsql security definer;

create or replace function public.set_user_tenant_status(
  p_user_id uuid,
  p_tenant_id uuid,
  p_status text
) returns void as $$
begin
  if app.current_tenant() is distinct from p_tenant_id then
    raise exception 'tenant mismatch';
  end if;

  if not public.has_any_role(array['SUPER_ADMIN','CEO']) then
    raise exception 'insufficient privileges';
  end if;

  update public.user_tenants
     set status = p_status
   where user_id = p_user_id and tenant_id = p_tenant_id;
end;
$$ language plpgsql security definer;
