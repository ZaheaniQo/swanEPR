-- Expand core tables with tenant_id and RLS alignment

-- Settings: add tenant_id for multi-tenant storage
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_tenant_r" ON settings;
DROP POLICY IF EXISTS "settings_tenant_w" ON settings;
CREATE POLICY "settings_tenant_r" ON settings
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );
CREATE POLICY "settings_tenant_w" ON settings
  FOR ALL USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );

-- Invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_tenant_r" ON invoices;
DROP POLICY IF EXISTS "invoices_tenant_w" ON invoices;
CREATE POLICY "invoices_tenant_r" ON invoices
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );
CREATE POLICY "invoices_tenant_w" ON invoices
  FOR ALL USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );

-- Invoice items
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_items_tenant_r" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant_w" ON invoice_items;
CREATE POLICY "invoice_items_tenant_r" ON invoice_items
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );
CREATE POLICY "invoice_items_tenant_w" ON invoice_items
  FOR ALL USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );

-- Disbursements
ALTER TABLE disbursements
  ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_disbursements_tenant_id ON disbursements(tenant_id);
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "disbursements_tenant_r" ON disbursements;
DROP POLICY IF EXISTS "disbursements_tenant_w" ON disbursements;
CREATE POLICY "disbursements_tenant_r" ON disbursements
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );
CREATE POLICY "disbursements_tenant_w" ON disbursements
  FOR ALL USING (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid())
  );

-- Receipts already aligned in 20251216020000_align_receipts.sql
