-- Ensure JWT custom claims hook is enabled

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
  end if;
exception when undefined_function then
  raise notice 'auth.set_config not available, skipping hook enable';
end;
$$;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'config'
       and column_name = 'jwt_custom_claims_hook'
  ) then
    execute 'update auth.config set jwt_custom_claims_hook = ''public.custom_access_token_hook''';
  end if;
exception when undefined_table then
  raise notice 'auth.config not found, skipping hook enable';
end;
$$;
