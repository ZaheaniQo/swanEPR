-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'PARTNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 2. TABLES DEFINITION
-- ==========================================

-- 2.1 PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'PARTNER', -- CEO, ACCOUNTING, MARKETING, WAREHOUSE, HR, PRODUCTION_MANAGER, PARTNER
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 2.2 COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  legal_name TEXT NOT NULL,
  vat_number TEXT,
  cr_number TEXT,
  address TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  bank_name TEXT,
  iban TEXT,
  branding JSONB DEFAULT '{}'::jsonb, -- Stores theme colors, fonts, etc.
  zakat_entity_type TEXT,
  calendar_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_settings BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 2.3 CHART OF ACCOUNTS (COA)
CREATE TABLE IF NOT EXISTS coa_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  subtype TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  balance NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;

-- 2.4 PARTIES (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  vat_number TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  vat_number TEXT,
  address TEXT,
  type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 2.5 HR
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  salary NUMERIC(10, 2),
  join_date DATE,
  status TEXT DEFAULT 'ACTIVE',
  iban TEXT,
  national_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_employees BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 2.6 INVENTORY & PRODUCTS
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, SERVICE, MATERIAL
  category TEXT,
  base_unit TEXT DEFAULT 'PCS',
  purchase_unit TEXT,
  sale_unit TEXT,
  conversion_rate NUMERIC(10, 4) DEFAULT 1,
  sales_price NUMERIC(15, 2) DEFAULT 0.00,
  standard_cost NUMERIC(15, 2) DEFAULT 0.00,
  avg_cost NUMERIC(15, 4) DEFAULT 0.00,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  cost NUMERIC(15, 2),
  price NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  quantity NUMERIC(15, 4) DEFAULT 0,
  reorder_level NUMERIC(15, 4) DEFAULT 0,
  location_bin TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_inventory_stock BEFORE UPDATE ON inventory_stock FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  type TEXT NOT NULL, -- RECEIPT, ISSUE, TRANSFER, ADJUSTMENT
  quantity NUMERIC(15, 4) NOT NULL,
  unit_cost NUMERIC(15, 4),
  reference_type TEXT,
  reference_id UUID,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 2.7 CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  client_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'Draft',
  total_value NUMERIC(15, 2) DEFAULT 0,
  start_date DATE,
  delivery_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_timestamp_contracts BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS contract_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;

-- 2.8 SALES (Quotations & Invoices)
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'DRAFT',
  subtotal NUMERIC(15, 2) DEFAULT 0,
  vat_amount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  vat_rate NUMERIC(5, 2) DEFAULT 0.15,
  amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'STANDARD',
  customer_id UUID REFERENCES customers(id),
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  status TEXT DEFAULT 'DRAFT',
  subtotal NUMERIC(15, 2) DEFAULT 0,
  vat_amount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  zatca_status TEXT DEFAULT 'NOT_REPORTED',
  zatca_uuid TEXT,
  qr_code TEXT,
  xml_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  vat_rate NUMERIC(5, 2) DEFAULT 0.15,
  amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 2.9 PURCHASES & EXPENSES
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  receipt_number TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  date DATE DEFAULT CURRENT_DATE,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS disbursements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'PENDING',
  approved_by UUID REFERENCES auth.users(id),
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;

-- 2.10 ACCOUNTING
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entry_number TEXT,
  date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  status TEXT DEFAULT 'DRAFT',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  journal_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES coa_accounts(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  description TEXT,
  debit NUMERIC(15, 2) DEFAULT 0,
  credit NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- 2.11 PROJECTS & PRODUCTION
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Planned',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS project_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  assigned_to UUID REFERENCES employees(id),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;

-- 2.12 APPROVALS
CREATE TABLE IF NOT EXISTS approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requester_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'PENDING',
  related_entity_id UUID,
  amount NUMERIC(15, 2),
  priority TEXT DEFAULT 'MEDIUM',
  approver_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 2.13 FIXED ASSETS
CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  depreciation_method TEXT DEFAULT 'STRAIGHT_LINE',
  useful_life_years INTEGER DEFAULT 5,
  asset_account_id UUID REFERENCES coa_accounts(id),
  accumulated_depreciation_account_id UUID REFERENCES coa_accounts(id),
  depreciation_expense_account_id UUID REFERENCES coa_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  category_id UUID REFERENCES asset_categories(id),
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC(15, 2) NOT NULL,
  salvage_value NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  location TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS asset_depreciation_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period INTEGER NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  is_posted BOOLEAN DEFAULT FALSE,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_depreciation_schedules ENABLE ROW LEVEL SECURITY;

-- 2.14 MANUFACTURING (BOM & Work Orders)
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  output_quantity NUMERIC(15, 2) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bom_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bom_id UUID REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  component_product_id UUID REFERENCES products(id),
  quantity NUMERIC(15, 4) NOT NULL,
  wastage_percent NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  bom_id UUID REFERENCES bill_of_materials(id),
  product_id UUID REFERENCES products(id),
  quantity_planned NUMERIC(15, 2) NOT NULL,
  quantity_produced NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'PLANNED',
  start_date DATE,
  due_date DATE,
  warehouse_id UUID REFERENCES warehouses(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- 2.15 HR & PAYROLL
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(15, 2) NOT NULL,
  housing_allowance NUMERIC(15, 2) DEFAULT 0,
  transport_allowance NUMERIC(15, 2) DEFAULT 0,
  other_allowances NUMERIC(15, 2) DEFAULT 0,
  gosi_deduction_percent NUMERIC(5, 2) DEFAULT 0.0975,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS leaves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING',
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  total_amount NUMERIC(15, 2) DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS payslips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  basic_salary NUMERIC(15, 2) NOT NULL,
  total_allowances NUMERIC(15, 2) NOT NULL,
  total_deductions NUMERIC(15, 2) NOT NULL,
  net_salary NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- 2.16 AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS POLICIES (Simplified for MVP)
-- ==========================================

-- Allow authenticated users to do everything (Internal ERP)
-- In production, you would restrict this based on 'profiles.role'

CREATE POLICY "Enable all access for authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON coa_accounts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON warehouses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON product_sizes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON inventory_stock FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON inventory_movements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON contracts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON contract_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON quotation_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON invoice_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON receipts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON disbursements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON cost_centers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON journal_entries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON journal_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON project_stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON approvals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON asset_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON asset_depreciation_schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON bill_of_materials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON bom_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON work_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON salary_structures FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON leaves FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON payroll_runs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON payslips FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 4. SEED DATA
-- ==========================================

INSERT INTO coa_accounts (code, name, type, subtype) VALUES
('1101', 'Cash on Hand', 'ASSET', 'Current Asset'),
('1102', 'Bank Albilad', 'ASSET', 'Current Asset'),
('1201', 'Accounts Receivable', 'ASSET', 'Current Asset'),
('1301', 'Inventory', 'ASSET', 'Current Asset'),
('1501', 'Furniture & Fixtures', 'ASSET', 'Fixed Asset'),
('2101', 'Accounts Payable', 'LIABILITY', 'Current Liability'),
('2102', 'VAT Payable', 'LIABILITY', 'Current Liability'),
('3101', 'Capital', 'EQUITY', 'Equity'),
('3201', 'Retained Earnings', 'EQUITY', 'Equity'),
('4101', 'Sales Revenue', 'INCOME', 'Operating Income'),
('5101', 'Cost of Goods Sold', 'EXPENSE', 'Cost of Sales'),
('5201', 'Salaries Expense', 'EXPENSE', 'Operating Expense'),
('5202', 'Rent Expense', 'EXPENSE', 'Operating Expense'),
('5203', 'Utilities Expense', 'EXPENSE', 'Operating Expense')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 5. AUDIT LOG TRIGGER FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION process_audit_log() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (table_name, record_id, operation, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_inventory_stock AFTER INSERT OR UPDATE OR DELETE ON inventory_stock FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_settings AFTER INSERT OR UPDATE OR DELETE ON settings FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_assets AFTER INSERT OR UPDATE OR DELETE ON assets FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_work_orders AFTER INSERT OR UPDATE OR DELETE ON work_orders FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_salary_structures AFTER INSERT OR UPDATE OR DELETE ON salary_structures FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- ==========================================
-- 6. MOCK DATA FOR TESTING
-- ==========================================

DO $$
DECLARE
  v_customer_id UUID;
  v_supplier_id UUID;
  v_employee_id UUID;
  v_warehouse_id UUID;
  v_product_1_id UUID;
  v_product_2_id UUID;
  v_contract_id UUID;
BEGIN

  -- 1. Settings
  INSERT INTO settings (legal_name, vat_number, cr_number, address, email, phone)
  VALUES ('Black Swan Co.', '300000000000003', '1010101010', 'Riyadh, Saudi Arabia', 'info@blackswan.com', '+966500000000')
  ON CONFLICT DO NOTHING;

  -- 2. Customers
  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Ahmed Al-Otaibi', 'Al-Otaibi Trading', 'ahmed@otaibi.com', '+966555555555', '310000000000003', 'Jeddah, SA')
  RETURNING id INTO v_customer_id;

  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Sarah Smith', 'Global Tech', 'sarah@globaltech.com', '+966544444444', '320000000000003', 'Riyadh, SA');

  -- 3. Suppliers
  INSERT INTO suppliers (name, contact_person, email, phone, vat_number, address, type)
  VALUES ('Raw Materials Co.', 'Khalid', 'sales@rawmaterials.com', '+966533333333', '330000000000003', 'Dammam, SA', 'Material')
  RETURNING id INTO v_supplier_id;

  -- 4. Employees
  INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
  VALUES ('Mohammed', 'Ali', 'mohammed@blackswan.com', '+966522222222', 'Sales Manager', 'Sales', 15000, '2023-01-01', 'ACTIVE')
  RETURNING id INTO v_employee_id;

  INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
  VALUES ('Noura', 'Saad', 'noura@blackswan.com', '+966511111111', 'HR Specialist', 'HR', 12000, '2023-03-15', 'ACTIVE');

  -- 5. Warehouses
  INSERT INTO warehouses (name, code, address, is_active)
  VALUES ('Main Warehouse', 'WH-001', 'Riyadh Industrial City', TRUE)
  RETURNING id INTO v_warehouse_id;

  -- 6. Products
  INSERT INTO products (sku, name, description, type, category, sales_price, standard_cost, base_unit)
  VALUES ('PRD-001', 'Cotton Fabric', 'High quality cotton fabric', 'MATERIAL', 'Raw Materials', 50.00, 30.00, 'Meter')
  RETURNING id INTO v_product_1_id;

  INSERT INTO products (sku, name, description, type, category, sales_price, standard_cost, base_unit)
  VALUES ('PRD-002', 'Men T-Shirt', 'Cotton T-Shirt White', 'PRODUCT', 'Apparel', 120.00, 60.00, 'PCS')
  RETURNING id INTO v_product_2_id;

  -- 7. Inventory Stock
  INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reorder_level, location_bin)
  VALUES (v_product_1_id, v_warehouse_id, 1000, 100, 'A-01');

  INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reorder_level, location_bin)
  VALUES (v_product_2_id, v_warehouse_id, 500, 50, 'B-05');

  -- 8. Contracts
  INSERT INTO contracts (contract_number, title, client_id, status, total_value, start_date, delivery_date)
  VALUES ('CNT-2024-001', 'Annual Supply Agreement', v_customer_id, 'Active', 500000, '2024-01-01', '2024-12-31')
  RETURNING id INTO v_contract_id;

  -- 9. Quotations
  INSERT INTO quotations (quotation_number, customer_id, date, expiry_date, status, subtotal, vat_amount, total_amount)
  VALUES ('QT-2024-001', v_customer_id, CURRENT_DATE, CURRENT_DATE + 30, 'SENT', 1000, 150, 1150);

  -- 10. Invoices
  INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, vat_amount, total_amount)
  VALUES ('INV-2024-001', v_customer_id, NOW(), CURRENT_DATE + 15, 'POSTED', 1200, 180, 1380);

END $$;
