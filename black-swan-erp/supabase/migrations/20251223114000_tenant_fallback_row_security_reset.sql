-- Reset row_security after tenant fallback lookup to avoid impacting caller queries

create or replace function app.current_tenant_id() returns uuid
language plpgsql stable security definer
set search_path = public, auth, app
as $$
declare v_tenant uuid;
begin
  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
  if v_tenant is null then
    perform set_config('row_security', 'off', true);
    select tenant_id into v_tenant
      from public.user_tenants
     where user_id = auth.uid()
       and status = 'ACTIVE'
       and is_default = true
     order by created_at
     limit 1;
    perform set_config('row_security', 'on', true);
  end if;
  return v_tenant;
end;
$$;
