-- Custom access token hook: inject tenant_id from server-side tables only

alter table public.user_tenants
  add column if not exists active boolean not null default false;

update public.user_tenants
set active = true
where is_default = true;

create unique index if not exists ux_user_tenants_active
  on public.user_tenants(user_id)
  where active;

create table if not exists public.user_tenant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  last_selected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists ux_user_tenant_sessions_user_tenant
  on public.user_tenant_sessions(user_id, tenant_id);
create index if not exists idx_user_tenant_sessions_user
  on public.user_tenant_sessions(user_id);

alter table public.user_tenant_sessions enable row level security;

drop policy if exists user_tenant_sessions_select on public.user_tenant_sessions;
create policy user_tenant_sessions_select on public.user_tenant_sessions
for select using (auth.uid() = user_id);

drop policy if exists user_tenant_sessions_insert on public.user_tenant_sessions;
create policy user_tenant_sessions_insert on public.user_tenant_sessions
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
      from public.user_tenants ut
     where ut.user_id = auth.uid()
       and ut.tenant_id = user_tenant_sessions.tenant_id
       and ut.status = 'ACTIVE'
  )
);

drop policy if exists user_tenant_sessions_update on public.user_tenant_sessions;
create policy user_tenant_sessions_update on public.user_tenant_sessions
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
      from public.user_tenants ut
     where ut.user_id = auth.uid()
       and ut.tenant_id = user_tenant_sessions.tenant_id
       and ut.status = 'ACTIVE'
  )
);

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
  v_claims := event->'claims';

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
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

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
  raise notice 'auth.config not found, skipping jwt_custom_claims_hook update';
end;
$$;
