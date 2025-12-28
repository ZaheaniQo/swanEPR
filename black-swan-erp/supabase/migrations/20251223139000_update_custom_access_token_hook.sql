-- Update custom access token hook to use deterministic server-side tenant selection

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, app
set row_security = off
as $$
declare
  v_user_id uuid;
  v_tenant uuid;
  v_claims jsonb;
begin
  v_user_id := (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims', '{}'::jsonb);

  select tenant_id
    into v_tenant
    from public.user_tenants
   where user_id = v_user_id
     and status = 'ACTIVE'
     and active = true
   order by updated_at desc nulls last, created_at asc nulls last
   limit 1;

  if v_tenant is null then
    select tenant_id
      into v_tenant
      from public.user_tenants
     where user_id = v_user_id
       and status = 'ACTIVE'
       and is_default = true
     order by created_at asc nulls last
     limit 1;
  end if;

  if v_tenant is null then
    select tenant_id
      into v_tenant
      from public.user_tenants
     where user_id = v_user_id
       and status = 'ACTIVE'
     order by created_at asc nulls last
     limit 1;
  end if;

  if v_tenant is null then
    select tenant_id
      into v_tenant
      from public.user_tenant_sessions
     where user_id = v_user_id
     order by last_selected_at desc
     limit 1;
  end if;

  v_claims := jsonb_set(v_claims, '{tenant_id}', to_jsonb(v_tenant), true);
  event := jsonb_set(event, '{claims}', v_claims, true);
  return event;
end;
$$;
