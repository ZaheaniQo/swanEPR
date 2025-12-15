-- Fix missing columns and tables for Contracts, Products, Invoices, Quotations

-- 1. Products: Add quality_level and sku_prefix
ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_level TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku_prefix TEXT;

-- 2. Contracts: Add party_a and party_b (JSONB snapshots)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_a JSONB DEFAULT '{}'::jsonb;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b JSONB DEFAULT '{}'::jsonb;

-- 3. Invoices: Add buyer (JSONB snapshot)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer JSONB DEFAULT '{}'::jsonb;

-- 4. Quotations: Add customer_details (JSONB snapshot)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_details JSONB DEFAULT '{}'::jsonb;

-- 5. Create contract_milestones table
CREATE TABLE IF NOT EXISTS contract_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(15, 2) DEFAULT 0,
  percentage NUMERIC(5, 2) DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'PENDING', -- PENDING, INVOICED, PAID
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON contract_milestones;
CREATE POLICY "Enable all access for authenticated users" ON contract_milestones FOR ALL USING (auth.role() = 'authenticated');
