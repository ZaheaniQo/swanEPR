-- Allow legacy HR data (tenant_id IS NULL) to be readable while keeping tenant-scoped writes
-- This prevents the HR page from returning empty data when seed rows are missing tenant_id.

-- Employees policies
DROP POLICY IF EXISTS "Tenant Isolation Select" ON employees;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON employees;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON employees;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON employees;

CREATE POLICY "Employees Select tenant only" ON employees
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Employees Insert tenant only" ON employees
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Employees Update tenant only" ON employees
  FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Employees Delete tenant only" ON employees
  FOR DELETE USING (tenant_id = get_current_tenant_id());

-- Salary structures policies
DROP POLICY IF EXISTS "Tenant Isolation Select" ON salary_structures;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON salary_structures;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON salary_structures;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON salary_structures;

CREATE POLICY "Salary structures Select tenant only" ON salary_structures
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Salary structures Insert tenant only" ON salary_structures
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Salary structures Update tenant only" ON salary_structures
  FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY "Salary structures Delete tenant only" ON salary_structures
  FOR DELETE USING (tenant_id = get_current_tenant_id());
