-- Compatibility: enable custom claims hook across auth.config variants

do $$
declare
  col text;
begin
  for col in
    select column_name
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'config'
       and column_name in ('jwt_custom_claims_hook', 'custom_access_token_hook', 'jwt_custom_access_token_hook')
  loop
    execute format('update auth.config set %I = %L', col, 'public.custom_access_token_hook');
  end loop;
exception when undefined_table then
  raise notice 'auth.config not found, skipping compat hook enable';
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
    perform auth.set_config('jwt.custom_access_token_hook', 'public.custom_access_token_hook');
    perform auth.set_config('jwt.custom_claims_hook', 'public.custom_access_token_hook');
  end if;
exception when undefined_function then
  raise notice 'auth.set_config not available, skipping compat hook enable';
end;
$$;
