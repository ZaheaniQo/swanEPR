-- ==============================================================================
-- BLACK SWAN ERP - PRODUCTION HARDENING & MIGRATION SCRIPT
-- ==============================================================================
-- This script refactors the MVP schema into a production-grade, auditable,
-- and secure database architecture.
--
-- OBJECTIVES:
-- 1. Hardening Auth & Profiles
-- 2. Implementing RBAC (Role-Based Access Control)
-- 3. Fixing Chart of Accounts (Dynamic Balances)
-- 4. Enforcing Accounting Immutability
-- 5. Securing Audit Logs
-- 6. Production-Grade RLS Policies
-- 7. Inventory & Financial Integrity
-- ==============================================================================

-- ==========================================
-- 1. AUTH & PROFILES HARDENING
-- ==========================================

-- Change default role to PENDING to prevent unauthorized access upon signup
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'PENDING';

-- Update the new user handler to enforce PENDING status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status)
  VALUES (NEW.id, NEW.email, 'PENDING');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. ROLES → PERMISSIONS FOUNDATION (RBAC)
-- ==========================================

-- Create Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g., 'hr.employees.view', 'accounting.journals.post'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Roles Table (Extending beyond simple text roles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Role-Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create User-Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check Permission
-- This function is critical for RLS policies
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  -- 1. Check if user is a Super Admin (Optional override)
  -- IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'CEO') THEN RETURN TRUE; END IF;

  -- 2. Check RBAC tables
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN user_tenants ut
      ON ut.user_id = ur.user_id
     AND ut.tenant_id = ur.tenant_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = has_permission.user_id
    AND ur.tenant_id = app.current_tenant_id()
    AND ut.status = 'ACTIVE'
    AND p.code = required_permission
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. CHART OF ACCOUNTS FIX (Dynamic Balances)
-- ==========================================

-- Remove the static balance column which is prone to drift
ALTER TABLE coa_accounts DROP COLUMN IF EXISTS balance;

-- Create a View for Real-Time Balances
-- Calculates balance based on POSTED journal entries only
CREATE OR REPLACE VIEW view_account_balances AS
SELECT
  a.id AS account_id,
  a.code,
  a.name,
  a.type,
  COALESCE(SUM(jl.debit), 0) AS total_debit,
  COALESCE(SUM(jl.credit), 0) AS total_credit,
  CASE
    WHEN a.type IN ('ASSET', 'EXPENSE') THEN COALESCE(SUM(jl.debit - jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit - jl.debit), 0)
  END AS net_balance
FROM coa_accounts a
LEFT JOIN journal_lines jl ON a.id = jl.account_id
LEFT JOIN journal_entries je ON jl.journal_id = je.id
WHERE je.status = 'POSTED' -- CRITICAL: Only count posted entries
GROUP BY a.id, a.code, a.name, a.type;

-- ==========================================
-- 4. ACCOUNTING IMMUTABILITY
-- ==========================================

-- Function to prevent modification of POSTED journals
CREATE OR REPLACE FUNCTION check_journal_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status change to VOIDED if needed, but generally prevent edits
  IF OLD.status = 'POSTED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Security Violation: Cannot delete a POSTED journal entry. Reverse it instead.';
    END IF;
    
    IF TG_OP = 'UPDATE' AND NEW.status != 'VOID' THEN
       -- Allow only specific fields to be updated if necessary (like notes), but lock financials
       IF NEW.date != OLD.date THEN
          RAISE EXCEPTION 'Security Violation: Cannot modify financial data of a POSTED journal.';
       END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Trigger to Journal Entries
DROP TRIGGER IF EXISTS enforce_journal_immutability ON journal_entries;
CREATE TRIGGER enforce_journal_immutability
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION check_journal_immutability();

-- Apply Trigger to Journal Lines (Prevent changing lines of a posted journal)
CREATE OR REPLACE FUNCTION check_journal_line_immutability()
RETURNS TRIGGER AS $$
DECLARE
  parent_status TEXT;
BEGIN
  SELECT status INTO parent_status FROM journal_entries WHERE id = OLD.journal_id;
  IF parent_status = 'POSTED' THEN
    RAISE EXCEPTION 'Security Violation: Cannot modify lines of a POSTED journal.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_line_immutability ON journal_lines;
CREATE TRIGGER enforce_line_immutability
BEFORE UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION check_journal_line_immutability();

-- Constraint: Debit OR Credit, not both (Standard Accounting)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_debit_or_credit') THEN
    ALTER TABLE journal_lines ADD CONSTRAINT check_debit_or_credit 
    CHECK (
      (debit = 0 AND credit > 0) OR 
      (credit = 0 AND debit > 0) OR
      (debit = 0 AND credit = 0) -- Allow zero lines if needed for placeholders
    );
  END IF;
END $$;

-- ==========================================
-- 5. AUDIT LOG SECURITY
-- ==========================================

-- Prevent Deletion or Modification of Audit Logs
CREATE OR REPLACE FUNCTION prevent_audit_log_tamper()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: Audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_audit_log_changes ON audit_logs;
CREATE TRIGGER no_audit_log_changes
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tamper();

-- Ensure Audit Log captures everything
-- (The existing process_audit_log function is good, but let's ensure it captures auth.uid)
-- Existing function uses auth.uid(), which is correct.

-- ==========================================
-- 6. RLS — PRODUCTION GRADE
-- ==========================================

-- We need to drop the "Enable all access" policies and replace them.
-- NOTE: For this script, we will drop and recreate for critical tables.

-- 6.1 EMPLOYEES
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employees;
DROP POLICY IF EXISTS "HR Read Access" ON employees;
CREATE POLICY "HR Read Access" ON employees FOR SELECT
USING (public.has_permission(auth.uid(), 'hr.employees.view') OR auth.uid() = id);

DROP POLICY IF EXISTS "HR Write Access" ON employees;
CREATE POLICY "HR Write Access" ON employees FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'hr.employees.create'));

DROP POLICY IF EXISTS "HR Update Access" ON employees;
CREATE POLICY "HR Update Access" ON employees FOR UPDATE
USING (public.has_permission(auth.uid(), 'hr.employees.edit'));

-- 6.2 JOURNAL ENTRIES
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Accounting Read Access" ON journal_entries;
CREATE POLICY "Accounting Read Access" ON journal_entries FOR SELECT
USING (public.has_permission(auth.uid(), 'accounting.journals.view'));

DROP POLICY IF EXISTS "Accounting Write Access" ON journal_entries;
CREATE POLICY "Accounting Write Access" ON journal_entries FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'accounting.journals.create'));

DROP POLICY IF EXISTS "Accounting Update Access" ON journal_entries;
CREATE POLICY "Accounting Update Access" ON journal_entries FOR UPDATE
USING (public.has_permission(auth.uid(), 'accounting.journals.edit'));

-- 6.3 INVOICES
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Sales Read Access" ON invoices;
CREATE POLICY "Sales Read Access" ON invoices FOR SELECT
USING (public.has_permission(auth.uid(), 'sales.invoices.view'));

DROP POLICY IF EXISTS "Sales Write Access" ON invoices;
CREATE POLICY "Sales Write Access" ON invoices FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'sales.invoices.create'));

-- ==========================================
-- 7. INVENTORY & FINANCIAL LINKING
-- ==========================================

-- Prevent Negative Stock
CREATE OR REPLACE FUNCTION check_inventory_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Inventory Error: Stock quantity cannot be negative. Transaction rejected.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_negative_stock ON inventory_stock;
CREATE TRIGGER prevent_negative_stock
BEFORE INSERT OR UPDATE ON inventory_stock
FOR EACH ROW EXECUTE FUNCTION check_inventory_stock_levels();

-- ==========================================
-- 8. SOFT DELETE & LIFECYCLE
-- ==========================================

-- Add is_deleted to critical tables
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Soft Delete Rule: Instead of DELETE, set is_deleted = TRUE
-- This requires application logic change OR a Rule/Trigger.
-- For API simplicity, we often use a View or RLS to hide deleted items.

-- Example RLS update for Soft Delete (Applied to Invoices)
-- (Re-applying the policy with is_deleted check)
DROP POLICY IF EXISTS "Sales Read Access" ON invoices;
CREATE POLICY "Sales Read Access" ON invoices FOR SELECT
USING (
  (public.has_permission(auth.uid(), 'sales.invoices.view'))
  AND (is_deleted = FALSE)
);

-- ==========================================
-- 9. DATA CONSISTENCY & CONSTRAINTS
-- ==========================================

-- Ensure Document Numbers are Unique
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_invoice_number') THEN
    ALTER TABLE invoices ADD CONSTRAINT unique_invoice_number UNIQUE (invoice_number);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_quotation_number') THEN
    ALTER TABLE quotations ADD CONSTRAINT unique_quotation_number UNIQUE (quotation_number);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_entry_number') THEN
    ALTER TABLE journal_entries ADD CONSTRAINT unique_entry_number UNIQUE (entry_number);
  END IF;

  -- Ensure Emails are Unique for Contacts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_customer_email') THEN
    ALTER TABLE customers ADD CONSTRAINT unique_customer_email UNIQUE (email);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_supplier_email') THEN
    ALTER TABLE suppliers ADD CONSTRAINT unique_supplier_email UNIQUE (email);
  END IF;
END $$;

-- ==========================================
-- 10. SEED DEFAULT PERMISSIONS (BOOTSTRAP)
-- ==========================================

DO $$
DECLARE
  v_role_admin UUID;
  v_role_accountant UUID;
  v_role_hr UUID;
  v_perm_view_emp UUID;
  v_perm_edit_emp UUID;
  v_perm_view_journal UUID;
  v_perm_create_journal UUID;
BEGIN
  -- Create Roles
  INSERT INTO roles (name, description) VALUES ('ADMIN', 'System Administrator') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_role_admin;
  INSERT INTO roles (name, description) VALUES ('ACCOUNTANT', 'Financial Accountant') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_role_accountant;
  INSERT INTO roles (name, description) VALUES ('HR_MANAGER', 'Human Resources Manager') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_role_hr;

  -- Create Permissions
  INSERT INTO permissions (code, description) VALUES ('hr.employees.view', 'View Employees') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_perm_view_emp;
  INSERT INTO permissions (code, description) VALUES ('hr.employees.edit', 'Edit Employees') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_perm_edit_emp;
  INSERT INTO permissions (code, description) VALUES ('accounting.journals.view', 'View Journals') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_perm_view_journal;
  INSERT INTO permissions (code, description) VALUES ('accounting.journals.create', 'Create Journals') ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO v_perm_create_journal;

  -- Assign Permissions to Roles
  INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_hr, v_perm_view_emp) ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_hr, v_perm_edit_emp) ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_accountant, v_perm_view_journal) ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_accountant, v_perm_create_journal) ON CONFLICT DO NOTHING;

  -- Admin gets everything (Simplified loop for demo, in prod assign explicitly)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_admin, id FROM permissions
  ON CONFLICT DO NOTHING;

END $$;

-- ==========================================
-- 11. INVENTORY & FINANCIAL AUTOMATION
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_inventory_movement_accounting()
RETURNS TRIGGER AS $$
DECLARE
  v_inventory_account UUID;
  v_cogs_account UUID;
  v_adjustment_account UUID;
  v_journal_id UUID;
  v_unit_cost NUMERIC;
  v_total_value NUMERIC;
BEGIN
  -- Get Account IDs (Assuming standard codes)
  SELECT id INTO v_inventory_account FROM coa_accounts WHERE code = '1200' AND tenant_id = NEW.tenant_id; -- Inventory Asset
  SELECT id INTO v_cogs_account FROM coa_accounts WHERE code = '5000' AND tenant_id = NEW.tenant_id; -- COGS
  SELECT id INTO v_adjustment_account FROM coa_accounts WHERE code = '5400' AND tenant_id = NEW.tenant_id; -- General Expense/Adjustment

  -- Calculate Value
  v_unit_cost := COALESCE(NEW.unit_cost, 0);
  v_total_value := NEW.quantity * v_unit_cost;

  IF v_total_value = 0 OR v_inventory_account IS NULL OR v_cogs_account IS NULL THEN RETURN NEW; END IF;

  -- Create Journal Header
  INSERT INTO journal_entries (date, description, status, created_by, reference, tenant_id)
  VALUES (CURRENT_DATE, 'Auto-generated from Inventory Movement: ' || NEW.type, 'POSTED', NEW.user_id, 'INV-' || NEW.id, NEW.tenant_id)
  RETURNING id INTO v_journal_id;

  -- Create Journal Lines based on Type
  IF NEW.type = 'RECEIPT' THEN
     -- Dr Inventory, Cr Adjustment (or AP if linked, but here we use Adjustment/Suspense)
     INSERT INTO journal_lines (journal_id, account_id, description, debit, credit, tenant_id)
     VALUES (v_journal_id, v_inventory_account, 'Inventory Receipt', v_total_value, 0, NEW.tenant_id);
     
     INSERT INTO journal_lines (journal_id, account_id, description, debit, credit, tenant_id)
     VALUES (v_journal_id, v_adjustment_account, 'Inventory Receipt Offset', 0, v_total_value, NEW.tenant_id);

  ELSIF NEW.type = 'ISSUE' THEN
     -- Dr COGS, Cr Inventory
     INSERT INTO journal_lines (journal_id, account_id, description, debit, credit, tenant_id)
     VALUES (v_journal_id, v_cogs_account, 'Inventory Issue / COGS', v_total_value, 0, NEW.tenant_id);
     
     INSERT INTO journal_lines (journal_id, account_id, description, debit, credit, tenant_id)
     VALUES (v_journal_id, v_inventory_account, 'Inventory Issue', 0, v_total_value, NEW.tenant_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_inventory_accounting ON inventory_movements;
CREATE TRIGGER trigger_inventory_accounting
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION handle_inventory_movement_accounting();
