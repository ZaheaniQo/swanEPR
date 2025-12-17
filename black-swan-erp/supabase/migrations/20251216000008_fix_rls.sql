-- Migration 08: Enforce Tenant Isolation via RLS
-- This replaces the permissive "Enable all access" policies with strict tenant checks.

-- Helper function to get current tenant_id safely
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid,
    auth.uid() -- Fallback for development/testing where user ID is treated as tenant ID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- List of tables to secure
-- profiles, settings, coa_accounts, customers, suppliers, employees, warehouses, products, product_sizes, 
-- inventory_stock, inventory_movements, contracts, contract_items, contract_milestones, quotations, quotation_items, 
-- invoices, invoice_items, receipts, disbursements, cost_centers, journal_entries, journal_lines, projects, 
-- project_stages, approvals, asset_categories, assets, asset_depreciation_schedules, bill_of_materials, 
-- bom_items, work_orders, salary_structures, leaves, payroll_runs, payslips, audit_logs

-- 1. PROFILES (User specific, not tenant specific in this schema, but usually 1:1)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. GENERIC TENANT TABLES
-- Ensure tenant_id exists on all target tables before creating policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'settings', 'coa_accounts', 'customers', 'suppliers', 'employees', 'warehouses',
    'products', 'product_sizes', 'inventory_stock', 'inventory_movements',
    'contracts', 'contract_items', 'contract_milestones', 'quotations', 'quotation_items',
    'invoices', 'invoice_items', 'receipts', 'disbursements', 'cost_centers',
    'journal_entries', 'journal_lines', 'projects', 'project_stages', 'approvals',
    'asset_categories', 'assets', 'asset_depreciation_schedules', 'bill_of_materials',
    'bom_items', 'work_orders', 'salary_structures', 'leaves', 'payroll_runs', 'payslips',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id)', t, t);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping tenant column ensure', t;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'settings', 'coa_accounts', 'customers', 'suppliers', 'employees', 'warehouses', 
    'products', 'product_sizes', 'inventory_stock', 'inventory_movements', 
    'contracts', 'contract_items', 'contract_milestones', 'quotations', 'quotation_items', 
    'invoices', 'invoice_items', 'receipts', 'disbursements', 'cost_centers', 
    'journal_entries', 'journal_lines', 'projects', 'project_stages', 'approvals', 
    'asset_categories', 'assets', 'asset_depreciation_schedules', 'bill_of_materials', 
    'bom_items', 'work_orders', 'salary_structures', 'leaves', 'payroll_runs', 'payslips', 
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users" ON %I', t);
      
      -- Policy for SELECT
      EXECUTE format('CREATE POLICY "Tenant Isolation Select" ON %I FOR SELECT USING (tenant_id = get_current_tenant_id())', t);
      
      -- Policy for INSERT (Check that new row belongs to tenant)
      EXECUTE format('CREATE POLICY "Tenant Isolation Insert" ON %I FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id())', t);
      
      -- Policy for UPDATE
      EXECUTE format('CREATE POLICY "Tenant Isolation Update" ON %I FOR UPDATE USING (tenant_id = get_current_tenant_id())', t);
      
      -- Policy for DELETE
      EXECUTE format('CREATE POLICY "Tenant Isolation Delete" ON %I FOR DELETE USING (tenant_id = get_current_tenant_id())', t);
      
    EXCEPTION WHEN undefined_table THEN
      -- Ignore if table doesn't exist (though they should)
      RAISE NOTICE 'Table % does not exist, skipping RLS update', t;
    END;
  END LOOP;
END $$;
