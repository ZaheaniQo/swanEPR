-- Align quotations schema with UI + RPC payloads

alter table public.quotations
  add column if not exists customer_name text,
  add column if not exists customer_company text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists customer_address text,
  add column if not exists customer_vat text;

alter table public.quotation_items
  add column if not exists total numeric,
  add column if not exists product_id uuid references public.products(id),
  add column if not exists size_id uuid references public.product_sizes(id);
