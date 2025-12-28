-- Fallback to default tenant membership when JWT tenant_id claim is missing

create or replace function app.current_tenant_id() returns uuid
language plpgsql stable
as $$
declare v_tenant uuid;
begin
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

create or replace function app.current_tenant() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;
