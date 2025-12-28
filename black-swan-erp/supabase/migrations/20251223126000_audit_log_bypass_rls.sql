-- Allow audit log trigger to write regardless of RLS (tenant guarded in payload)

create or replace function process_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, auth, app
set row_security = off
as $$
declare
  v_tenant uuid;
begin
  if tg_op = 'DELETE' then
    v_tenant := coalesce(old.tenant_id, app.current_tenant_id());
    insert into audit_logs (table_name, record_id, operation, old_data, changed_by, tenant_id)
    values (tg_table_name, old.id, 'DELETE', row_to_json(old), auth.uid(), v_tenant);
    return old;
  elsif tg_op = 'UPDATE' then
    v_tenant := coalesce(new.tenant_id, old.tenant_id, app.current_tenant_id());
    insert into audit_logs (table_name, record_id, operation, old_data, new_data, changed_by, tenant_id)
    values (tg_table_name, new.id, 'UPDATE', row_to_json(old), row_to_json(new), auth.uid(), v_tenant);
    return new;
  elsif tg_op = 'INSERT' then
    v_tenant := coalesce(new.tenant_id, app.current_tenant_id());
    insert into audit_logs (table_name, record_id, operation, new_data, changed_by, tenant_id)
    values (tg_table_name, new.id, 'INSERT', row_to_json(new), auth.uid(), v_tenant);
    return new;
  end if;
  return null;
end;
$$;
