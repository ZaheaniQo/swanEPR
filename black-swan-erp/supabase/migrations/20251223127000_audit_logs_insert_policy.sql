-- Allow audit log inserts from application flows

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
for insert with check (auth.role() in ('authenticated', 'service_role'));
