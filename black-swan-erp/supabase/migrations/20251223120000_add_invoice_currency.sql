-- Align invoices schema with secure RPC usage

alter table public.invoices
  add column if not exists currency text default 'SAR';
