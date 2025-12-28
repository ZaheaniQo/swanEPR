-- Align contract_milestones schema with RPC payloads

alter table public.contract_milestones
  add column if not exists name text,
  add column if not exists amount_type text,
  add column if not exists value numeric,
  add column if not exists trigger text;
