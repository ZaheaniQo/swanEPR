-- ==============================================================================
-- BLACK SWAN ERP - SEED DATA
-- ==============================================================================
-- This file contains the initial demo/seed data for the application.
-- It is designed to be IDEMPOTENT (safe to run multiple times).
-- It is executed automatically by Supabase after migrations during `db reset`.
-- ==============================================================================

-- Seed runs without auth; inject an unassigned tenant claim for defaults
select set_config('request.jwt.claims', '{"tenant_id":"00000000-0000-0000-0000-000000000000"}', true);

-- 1. CHART OF ACCOUNTS
-- ==============================================================================
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

-- 2. ENTITIES & TRANSACTIONS
-- ==============================================================================
DO $$
DECLARE
  v_settings_id UUID;
  v_customer_id UUID;
  v_supplier_id UUID;
  v_employee_id UUID;
  v_warehouse_id UUID;
  v_product_1_id UUID;
  v_product_2_id UUID;
  v_contract_id UUID;
BEGIN

  -- 2.1 Settings (Singleton check - Update first record or Insert)
  SELECT id INTO v_settings_id FROM settings LIMIT 1;
  
  IF v_settings_id IS NOT NULL THEN
      UPDATE settings SET
        legal_name = 'Black Swan Co.',
        vat_number = '300000000000003',
        cr_number = '1010101010',
        address = 'Riyadh, Saudi Arabia',
        email = 'info@blackswan.com',
        phone = '+966500000000',
        updated_at = NOW()
      WHERE id = v_settings_id;
  ELSE
      INSERT INTO settings (legal_name, vat_number, cr_number, address, email, phone)
      VALUES ('Black Swan Co.', '300000000000003', '1010101010', 'Riyadh, Saudi Arabia', 'info@blackswan.com', '+966500000000');
  END IF;

  -- 2.2 Customers
  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Ahmed Al-Otaibi', 'Al-Otaibi Trading', 'ahmed@otaibi.com', '+966555555555', '310000000000003', 'Jeddah, SA')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW()
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM customers WHERE email = 'ahmed@otaibi.com';
  END IF;

  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Sarah Smith', 'Global Tech', 'sarah@globaltech.com', '+966544444444', '320000000000003', 'Riyadh, SA')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

  -- 2.3 Suppliers
  INSERT INTO suppliers (name, contact_person, email, phone, vat_number, address, type)
  VALUES ('Raw Materials Co.', 'Khalid', 'sales@rawmaterials.com', '+966533333333', '330000000000003', 'Dammam, SA', 'Material')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW()
  RETURNING id INTO v_supplier_id;

  IF v_supplier_id IS NULL THEN
      SELECT id INTO v_supplier_id FROM suppliers WHERE email = 'sales@rawmaterials.com';
  END IF;

  -- 2.4 Employees
  INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
  VALUES ('Mohammed', 'Ali', 'mohammed@blackswan.com', '+966522222222', 'Sales Manager', 'Sales', 15000, '2023-01-01', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET
    salary = EXCLUDED.salary,
    updated_at = NOW()
  RETURNING id INTO v_employee_id;

  IF v_employee_id IS NULL THEN
      SELECT id INTO v_employee_id FROM employees WHERE email = 'mohammed@blackswan.com';
  END IF;

  INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
  VALUES ('Noura', 'Saad', 'noura@blackswan.com', '+966511111111', 'HR Specialist', 'HR', 12000, '2023-03-15', 'ACTIVE')
  ON CONFLICT (email) DO UPDATE SET
    salary = EXCLUDED.salary,
    updated_at = NOW();

  -- 2.5 Warehouses
  INSERT INTO warehouses (name, code, address, is_active)
  VALUES ('Main Warehouse', 'WH-001', 'Riyadh Industrial City', TRUE)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name
  RETURNING id INTO v_warehouse_id;

  IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id FROM warehouses WHERE code = 'WH-001';
  END IF;

  -- 2.6 Products
  INSERT INTO products (sku, name, description, type, category, sales_price, standard_cost, base_unit)
  VALUES ('PRD-001', 'Cotton Fabric', 'High quality cotton fabric', 'MATERIAL', 'Raw Materials', 50.00, 30.00, 'Meter')
  ON CONFLICT (sku) DO UPDATE SET
    sales_price = EXCLUDED.sales_price,
    updated_at = NOW()
  RETURNING id INTO v_product_1_id;

  IF v_product_1_id IS NULL THEN
      SELECT id INTO v_product_1_id FROM products WHERE sku = 'PRD-001';
  END IF;

  INSERT INTO products (sku, name, description, type, category, sales_price, standard_cost, base_unit)
  VALUES ('PRD-002', 'Men T-Shirt', 'Cotton T-Shirt White', 'PRODUCT', 'Apparel', 120.00, 60.00, 'PCS')
  ON CONFLICT (sku) DO UPDATE SET
    sales_price = EXCLUDED.sales_price,
    updated_at = NOW()
  RETURNING id INTO v_product_2_id;

  IF v_product_2_id IS NULL THEN
      SELECT id INTO v_product_2_id FROM products WHERE sku = 'PRD-002';
  END IF;

  -- 2.7 Inventory Stock
  INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reorder_level, location_bin)
  VALUES (v_product_1_id, v_warehouse_id, 1000, 100, 'A-01')
  ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

  INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reorder_level, location_bin)
  VALUES (v_product_2_id, v_warehouse_id, 500, 50, 'B-05')
  ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

  -- 2.8 Contracts
  INSERT INTO contracts (contract_number, title, client_id, status, total_value, start_date, delivery_date)
  VALUES ('CNT-2024-001', 'Annual Supply Agreement', v_customer_id, 'Active', 500000, '2024-01-01', '2024-12-31')
  ON CONFLICT (contract_number) DO UPDATE SET
    total_value = EXCLUDED.total_value,
    updated_at = NOW()
  RETURNING id INTO v_contract_id;

  IF v_contract_id IS NULL THEN
      SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'CNT-2024-001';
  END IF;

  -- 2.9 Quotations
  INSERT INTO quotations (quotation_number, customer_id, date, expiry_date, status, subtotal, vat_amount, total_amount)
  VALUES ('QT-2024-001', v_customer_id, CURRENT_DATE, CURRENT_DATE + 30, 'SENT', 1000, 150, 1150)
  ON CONFLICT (quotation_number) DO UPDATE SET
    total_amount = EXCLUDED.total_amount;

  -- 2.10 Invoices
  INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, vat_amount, total_amount)
  VALUES ('INV-2024-001', v_customer_id, NOW(), CURRENT_DATE + 15, 'POSTED', 1200, 180, 1380)
  ON CONFLICT (invoice_number) DO UPDATE SET
    status = EXCLUDED.status;

END $$;
