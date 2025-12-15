-- Add tenant_id to detail tables
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contract_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_sizes_tenant_id ON product_sizes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_tenant_id ON contract_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_tenant_id ON contract_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_tenant_id ON quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_id ON journal_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_tenant_id ON project_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_tenant_id ON bom_items(tenant_id);
