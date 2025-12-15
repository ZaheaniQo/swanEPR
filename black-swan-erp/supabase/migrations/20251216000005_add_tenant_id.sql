-- Add tenant_id to all tables to support multi-tenancy
-- We add it as nullable first to avoid issues with existing data, 
-- but ideally it should be populated and then made not null.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE coa_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create index on tenant_id for performance
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_accounts_tenant_id ON coa_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_tenant_id ON disbursements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_id ON inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON journal_entries(tenant_id);
