-- Enforce claim-first tenant resolution (no runtime fallback)

create or replace function app.current_tenant_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
$$;

create or replace function app.current_tenant() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

create or replace function public.current_tenant_id() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

create or replace function public.current_tenant() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

create or replace function public.get_current_tenant_id() returns uuid
language sql stable
as $$
  select app.current_tenant_id();
$$;

-- Approvals: allow self-request when tenant claim is missing (unassigned tenant only)
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals
for select using (
  (tenant_id = app.current_tenant_id()
   and public.has_any_role(array['SUPER_ADMIN','CEO']))
  or (
    app.current_tenant_id() is null
    and requester_id = auth.uid()
    and tenant_id = app.unassigned_tenant_id()
  )
);

drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals
for insert with check (
  (tenant_id = app.current_tenant_id()
   and (public.has_any_role(array['SUPER_ADMIN','CEO']) or requester_id = auth.uid()))
  or (
    app.current_tenant_id() is null
    and requester_id = auth.uid()
    and tenant_id = app.unassigned_tenant_id()
  )
);

drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals
for update using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

drop policy if exists approvals_delete on public.approvals;
create policy approvals_delete on public.approvals
for delete using (
  tenant_id = app.current_tenant_id()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
