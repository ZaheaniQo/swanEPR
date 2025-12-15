-- ==============================================================================
-- BLACK SWAN ERP - IDEMPOTENT SEED DATA FIX
-- ==============================================================================
-- This migration fixes the seed data insertion logic to be idempotent.
-- It uses ON CONFLICT or procedural checks to ensure data is upserted
-- without violating unique constraints, allowing migrations to be re-run safely.
-- ==============================================================================

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

  -- 1. Settings (Singleton check)
  -- Settings table usually doesn't have a unique key besides ID, so we check existence.
  IF NOT EXISTS (SELECT 1 FROM settings LIMIT 1) THEN
      INSERT INTO settings (legal_name, vat_number, cr_number, address, email, phone)
      VALUES ('Black Swan Co.', '300000000000003', '1010101010', 'Riyadh, Saudi Arabia', 'info@blackswan.com', '+966500000000');
  ELSE
      UPDATE settings SET
        legal_name = 'Black Swan Co.',
        vat_number = '300000000000003',
        updated_at = NOW()
      WHERE legal_name = 'Black Swan Co.'; -- Simple update to ensure data matches
  END IF;

  -- 2. Customers (Unique Email)
  -- Constraint: unique_customer_email (from production_hardening.sql)
  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Ahmed Al-Otaibi', 'Al-Otaibi Trading', 'ahmed@otaibi.com', '+966555555555', '310000000000003', 'Jeddah, SA')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW()
  RETURNING id INTO v_customer_id;

  -- Fallback if update didn't return ID (e.g. if nothing changed? No, RETURNING works on update too)
  -- But just in case of complex triggers or RLS, we can select if null.
  IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM customers WHERE email = 'ahmed@otaibi.com';
  END IF;

  INSERT INTO customers (name, company_name, email, phone, vat_number, address)
  VALUES ('Sarah Smith', 'Global Tech', 'sarah@globaltech.com', '+966544444444', '320000000000003', 'Riyadh, SA')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

  -- 3. Suppliers (Unique Email)
  -- Constraint: unique_supplier_email (from production_hardening.sql)
  INSERT INTO suppliers (name, contact_person, email, phone, vat_number, address, type)
  VALUES ('Raw Materials Co.', 'Khalid', 'sales@rawmaterials.com', '+966533333333', '330000000000003', 'Dammam, SA', 'Material')
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW()
  RETURNING id INTO v_supplier_id;

  IF v_supplier_id IS NULL THEN
      SELECT id INTO v_supplier_id FROM suppliers WHERE email = 'sales@rawmaterials.com';
  END IF;

  -- 4. Employees
  -- Note: Employees table might not have a unique constraint on email in all versions.
  -- We use a procedural check to be safe and compliant with "Don't add new constraints".
  SELECT id INTO v_employee_id FROM employees WHERE email = 'mohammed@blackswan.com' LIMIT 1;
  
  IF v_employee_id IS NULL THEN
      INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
      VALUES ('Mohammed', 'Ali', 'mohammed@blackswan.com', '+966522222222', 'Sales Manager', 'Sales', 15000, '2023-01-01', 'ACTIVE')
      RETURNING id INTO v_employee_id;
  ELSE
      UPDATE employees SET
        salary = 15000,
        updated_at = NOW()
      WHERE id = v_employee_id;
  END IF;

  -- Second employee
  IF NOT EXISTS (SELECT 1 FROM employees WHERE email = 'noura@blackswan.com') THEN
      INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, join_date, status)
      VALUES ('Noura', 'Saad', 'noura@blackswan.com', '+966511111111', 'HR Specialist', 'HR', 12000, '2023-03-15', 'ACTIVE');
  END IF;

  -- 5. Warehouses (Unique Code)
  INSERT INTO warehouses (name, code, address, is_active)
  VALUES ('Main Warehouse', 'WH-001', 'Riyadh Industrial City', TRUE)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name
  RETURNING id INTO v_warehouse_id;

  IF v_warehouse_id IS NULL THEN
      SELECT id INTO v_warehouse_id FROM warehouses WHERE code = 'WH-001';
  END IF;

  -- 6. Products (Unique SKU)
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

  -- 7. Inventory Stock (Unique product_id + warehouse_id)
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

  -- 8. Contracts (Unique contract_number)
  INSERT INTO contracts (contract_number, title, client_id, status, total_value, start_date, delivery_date)
  VALUES ('CNT-2024-001', 'Annual Supply Agreement', v_customer_id, 'Active', 500000, '2024-01-01', '2024-12-31')
  ON CONFLICT (contract_number) DO UPDATE SET
    total_value = EXCLUDED.total_value,
    updated_at = NOW()
  RETURNING id INTO v_contract_id;

  -- 9. Quotations (Unique quotation_number)
  INSERT INTO quotations (quotation_number, customer_id, date, expiry_date, status, subtotal, vat_amount, total_amount)
  VALUES ('QT-2024-001', v_customer_id, CURRENT_DATE, CURRENT_DATE + 30, 'SENT', 1000, 150, 1150)
  ON CONFLICT (quotation_number) DO UPDATE SET
    total_amount = EXCLUDED.total_amount;

  -- 10. Invoices (Unique invoice_number)
  INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, subtotal, vat_amount, total_amount)
  VALUES ('INV-2024-001', v_customer_id, NOW(), CURRENT_DATE + 15, 'POSTED', 1200, 180, 1380)
  ON CONFLICT (invoice_number) DO UPDATE SET
    status = EXCLUDED.status;

END $$;
