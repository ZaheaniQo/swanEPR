-- Align receipts table with UI expectations (customer receipts) and tenant RLS

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS contract_id uuid,
  ADD COLUMN IF NOT EXISTS contract_title text,
  ADD COLUMN IF NOT EXISTS milestone_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS amount numeric(15,2),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill amount from legacy total_amount if present
UPDATE receipts SET amount = COALESCE(amount, total_amount) WHERE COALESCE(amount, total_amount) IS NOT NULL;

-- Ensure RLS is enabled and policies are aligned with tenant_id from JWT (or auth.uid fallback)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_tenant_r" ON receipts;
DROP POLICY IF EXISTS "receipts_tenant_w" ON receipts;
CREATE POLICY "receipts_tenant_r" ON receipts
  FOR SELECT USING (
    tenant_id = app.current_tenant_id()
  );
CREATE POLICY "receipts_tenant_w" ON receipts
  FOR ALL USING (
    tenant_id = app.current_tenant_id()
  )
  WITH CHECK (
    tenant_id = app.current_tenant_id()
  );
