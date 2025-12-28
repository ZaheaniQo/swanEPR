-- Align payroll tables with tenant + audit fields and strict RLS

-- Add metadata columns
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS processed_by UUID;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS processed_by UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_id ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payslips_tenant_id ON payslips(tenant_id);

-- Policies: allow tenant or legacy null reads, but writes enforce tenant
DROP POLICY IF EXISTS "Tenant Isolation Select" ON payroll_runs;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON payroll_runs;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON payroll_runs;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON payroll_runs;

CREATE POLICY "Payroll Select tenant only" ON payroll_runs
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Payroll Insert tenant only" ON payroll_runs
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Payroll Update tenant" ON payroll_runs
  FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Payroll Delete tenant" ON payroll_runs
  FOR DELETE USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation Select" ON payslips;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON payslips;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON payslips;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON payslips;

CREATE POLICY "Payslips Select tenant only" ON payslips
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Payslips Insert tenant only" ON payslips
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Payslips Update tenant" ON payslips
  FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Payslips Delete tenant" ON payslips
  FOR DELETE USING (tenant_id = get_current_tenant_id());
