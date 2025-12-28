-- Reassert custom access token hook configuration and grants

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
   order by updated_at desc nulls last
   limit 1;

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

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    grant execute on function public.custom_access_token_hook(jsonb) to supabase_admin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant execute on function public.custom_access_token_hook(jsonb) to authenticator;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.custom_access_token_hook(jsonb) to service_role;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'auth'
       and p.proname = 'set_config'
  ) then
    perform auth.set_config('jwt.custom_claims_hook', 'public.custom_access_token_hook');
    perform auth.set_config('jwt.custom_access_token_hook', 'public.custom_access_token_hook');
  end if;
exception when others then
  raise notice 'auth.set_config not available or failed, skipping hook enable';
end;
$$;

do $$
declare
  col text;
begin
  if exists (
    select 1
      from information_schema.tables
     where table_schema = 'auth'
       and table_name = 'config'
  ) then
    for col in
      select column_name
        from information_schema.columns
       where table_schema = 'auth'
         and table_name = 'config'
         and column_name in ('jwt_custom_claims_hook', 'custom_access_token_hook', 'jwt_custom_access_token_hook')
    loop
      execute format('update auth.config set %I = %L', col, 'public.custom_access_token_hook');
    end loop;
  end if;
exception when others then
  raise notice 'auth.config not available or failed, skipping hook enable';
end;
$$;
