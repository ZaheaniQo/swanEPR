-- Ensure auth.config key/value storage includes the custom claims hook

do $$
declare
  has_key boolean := false;
  has_value boolean := false;
begin
  select exists(
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'config'
       and column_name = 'key'
  ) into has_key;

  select exists(
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'config'
       and column_name = 'value'
  ) into has_value;

  if has_key and has_value then
    begin
      execute 'insert into auth.config("key", "value") values (''jwt.custom_claims_hook'', ''public.custom_access_token_hook'') on conflict ("key") do update set "value" = excluded."value"';
      execute 'insert into auth.config("key", "value") values (''jwt.custom_access_token_hook'', ''public.custom_access_token_hook'') on conflict ("key") do update set "value" = excluded."value"';
    exception when others then
      raise notice 'auth.config key/value update failed';
    end;
  end if;
exception when insufficient_privilege then
  raise notice 'Insufficient privilege to update auth.config key/value';
end;
$$;
