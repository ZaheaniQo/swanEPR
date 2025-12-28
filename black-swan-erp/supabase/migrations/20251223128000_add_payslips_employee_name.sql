-- Align payslips schema with payroll RPC payloads

alter table public.payslips
  add column if not exists employee_name text;
