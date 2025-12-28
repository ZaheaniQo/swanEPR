-- Ensure tenant fallback does not recurse via RLS (security definer + row_security off)

create or replace function app.current_tenant_id() returns uuid
language plpgsql stable security definer
set search_path = public, auth, app
as $$
declare v_tenant uuid;
begin
  perform set_config('row_security', 'off', true);

  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
  if v_tenant is null then
    select tenant_id into v_tenant
      from public.user_tenants
     where user_id = auth.uid()
       and status = 'ACTIVE'
       and is_default = true
     order by created_at
     limit 1;
  end if;
  return v_tenant;
end;
$$;
