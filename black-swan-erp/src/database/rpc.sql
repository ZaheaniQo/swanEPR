-- Supabase RPC Functions for Black Swan ERP
-- These functions replace direct table writes to ensure transactional integrity and enforce business logic.

-- 1. Create Employee (Transactional)
CREATE OR REPLACE FUNCTION create_employee(
  p_employee jsonb,
  p_salary jsonb
) RETURNS jsonb AS $$
DECLARE
  v_emp_id uuid;
  v_tenant_id uuid;
BEGIN
  -- Resolve Tenant (Assumes tenant_id is on auth.users or handled by RLS default)
  -- For this implementation, we assume RLS handles tenant_id on insert if not provided, 
  -- or we extract it from the current user's metadata if needed. 
  -- Here we rely on the table's default or trigger for tenant_id, or pass it if needed.
  -- We will assume the client passes the data ready for insertion, but we can enforce tenant_id here if we look it up.
  
  INSERT INTO employees (
    first_name, last_name, email, phone, position, department, 
    salary, join_date, status, iban, national_id
  ) VALUES (
    p_employee->>'first_name',
    p_employee->>'last_name',
    p_employee->>'email',
    p_employee->>'phone',
    p_employee->>'position',
    p_employee->>'department',
    (p_employee->>'salary')::numeric,
    (p_employee->>'join_date')::timestamp,
    p_employee->>'status',
    p_employee->>'iban',
    p_employee->>'national_id'
  ) RETURNING id INTO v_emp_id;

  INSERT INTO salary_structures (
    employee_id, basic_salary, housing_allowance, 
    transport_allowance, other_allowances, effective_date
  ) VALUES (
    v_emp_id,
    (p_salary->>'basic_salary')::numeric,
    (p_salary->>'housing_allowance')::numeric,
    (p_salary->>'transport_allowance')::numeric,
    (p_salary->>'other_allowances')::numeric,
    (p_salary->>'effective_date')::timestamp
  );

  RETURN jsonb_build_object('id', v_emp_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Create Product (Transactional)
CREATE OR REPLACE FUNCTION create_product(
  p_product jsonb,
  p_sizes jsonb
) RETURNS jsonb AS $$
DECLARE
  v_prod_id uuid;
BEGIN
  INSERT INTO products (
    sku, name, description, category, base_unit, sales_price, 
    standard_cost, avg_cost, image_url, quality_level, sku_prefix
  ) VALUES (
    p_product->>'sku',
    p_product->>'name',
    p_product->>'description',
    p_product->>'category',
    p_product->>'base_unit',
    (p_product->>'sales_price')::numeric,
    (p_product->>'standard_cost')::numeric,
    (p_product->>'avg_cost')::numeric,
    p_product->>'image_url',
    p_product->>'quality_level',
    p_product->>'sku_prefix'
  ) RETURNING id INTO v_prod_id;

  IF jsonb_array_length(p_sizes) > 0 THEN
    INSERT INTO product_sizes (product_id, size, cost, price)
    SELECT 
      v_prod_id,
      x->>'size',
      (x->>'cost')::numeric,
      (x->>'price')::numeric
    FROM jsonb_array_elements(p_sizes) x;
  END IF;

  RETURN jsonb_build_object('id', v_prod_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Create Contract (Transactional)
CREATE OR REPLACE FUNCTION create_contract(
  p_contract jsonb,
  p_items jsonb,
  p_milestones jsonb
) RETURNS jsonb AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  INSERT INTO contracts (
    contract_number, title, client_id, status, total_value, 
    start_date, delivery_date, notes, created_by, party_a, party_b, currency
  ) VALUES (
    p_contract->>'contract_number',
    p_contract->>'title',
    (p_contract->>'client_id')::uuid,
    p_contract->>'status',
    (p_contract->>'total_value')::numeric,
    (p_contract->>'start_date')::timestamp,
    (p_contract->>'delivery_date')::timestamp,
    p_contract->>'notes',
    (p_contract->>'created_by')::uuid,
    p_contract->'party_a',
    p_contract->'party_b',
    p_contract->>'currency'
  ) RETURNING id INTO v_contract_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO contract_items (contract_id, product_name, quantity, unit_price)
    SELECT 
      v_contract_id,
      x->>'product_name',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric
    FROM jsonb_array_elements(p_items) x;
  END IF;

  IF jsonb_array_length(p_milestones) > 0 THEN
    INSERT INTO contract_milestones (contract_id, title, amount, percentage, due_date, status, paid_at)
    SELECT 
      v_contract_id,
      x->>'title',
      (x->>'amount')::numeric,
      (x->>'percentage')::numeric,
      (x->>'due_date')::timestamp,
      x->>'status',
      (x->>'paid_at')::timestamp
    FROM jsonb_array_elements(p_milestones) x;
  END IF;

  RETURN jsonb_build_object('id', v_contract_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Process Inventory Movement (Transactional)
CREATE OR REPLACE FUNCTION process_inventory_movement(
  p_product_id uuid,
  p_warehouse_id uuid,
  p_type text,
  p_quantity numeric,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_current_qty numeric;
  v_stock_id uuid;
BEGIN
  -- Get current stock or create if not exists (Upsert logic)
  SELECT id, quantity INTO v_stock_id, v_current_qty 
  FROM inventory_stock 
  WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  IF v_stock_id IS NULL THEN
    INSERT INTO inventory_stock (product_id, warehouse_id, quantity)
    VALUES (p_product_id, p_warehouse_id, 0)
    RETURNING id, quantity INTO v_stock_id, v_current_qty;
  END IF;

  -- Update Stock
  UPDATE inventory_stock 
  SET quantity = quantity + p_quantity -- p_quantity should be negative for issues
  WHERE id = v_stock_id;

  -- Record Movement
  INSERT INTO inventory_movements (
    product_id, warehouse_id, type, quantity, date, user_id
  ) VALUES (
    p_product_id, p_warehouse_id, p_type, ABS(p_quantity), now(), p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Create Quotation (Transactional)
CREATE OR REPLACE FUNCTION create_quotation(
  p_quotation jsonb,
  p_items jsonb
) RETURNS jsonb AS $$
DECLARE
  v_quotation_id uuid;
BEGIN
  INSERT INTO quotations (
    quotation_number, customer_id, date, expiry_date, status, 
    subtotal, vat_amount, total_amount, notes, customer_details
  ) VALUES (
    p_quotation->>'quotation_number',
    (p_quotation->>'customer_id')::uuid,
    (p_quotation->>'date')::timestamp,
    (p_quotation->>'expiry_date')::timestamp,
    p_quotation->>'status',
    (p_quotation->>'subtotal')::numeric,
    (p_quotation->>'vat_amount')::numeric,
    (p_quotation->>'total_amount')::numeric,
    p_quotation->>'notes',
    p_quotation->'customer_details'
  ) RETURNING id INTO v_quotation_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO quotation_items (quotation_id, description, quantity, unit_price, vat_rate)
    SELECT 
      v_quotation_id,
      x->>'description',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric,
      (x->>'vat_rate')::numeric
    FROM jsonb_array_elements(p_items) x;
  END IF;

  RETURN jsonb_build_object('id', v_quotation_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 6. Create Tax Invoice (Transactional)
CREATE OR REPLACE FUNCTION create_invoice(
  p_invoice jsonb,
  p_items jsonb
) RETURNS jsonb AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  INSERT INTO invoices (
    invoice_number, type, customer_id, issue_date, due_date, 
    status, subtotal, vat_amount, total_amount
  ) VALUES (
    p_invoice->>'invoice_number',
    p_invoice->>'type',
    (p_invoice->>'customer_id')::uuid,
    (p_invoice->>'issue_date')::timestamp,
    (p_invoice->>'due_date')::timestamp,
    p_invoice->>'status',
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'vat_amount')::numeric,
    (p_invoice->>'total_amount')::numeric
  ) RETURNING id INTO v_invoice_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_rate)
    SELECT 
      v_invoice_id,
      x->>'description',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric,
      (x->>'vat_rate')::numeric
    FROM jsonb_array_elements(p_items) x;
  END IF;

  RETURN jsonb_build_object('id', v_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. Create Journal Entry (Transactional with Dynamic Account Lookup)
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_entry jsonb,
  p_lines jsonb
) RETURNS jsonb AS $$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_account_id uuid;
BEGIN
  INSERT INTO journal_entries (
    entry_number, date, reference, description, status, created_by
  ) VALUES (
    p_entry->>'entry_number',
    (p_entry->>'date')::timestamp,
    p_entry->>'reference',
    p_entry->>'description',
    p_entry->>'status',
    p_entry->>'created_by'
  ) RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- Dynamic Account Lookup by Code if ID is not provided or if we want to enforce code
    -- Assuming p_lines has 'account_code' or 'account_id'
    IF v_line->>'account_id' IS NOT NULL THEN
       v_account_id := (v_line->>'account_id')::uuid;
    ELSE
       SELECT id INTO v_account_id FROM coa_accounts WHERE code = v_line->>'account_code';
       IF v_account_id IS NULL THEN
         RAISE EXCEPTION 'Account code % not found', v_line->>'account_code';
       END IF;
    END IF;

    INSERT INTO journal_lines (
      journal_id, account_id, cost_center_id, description, debit, credit
    ) VALUES (
      v_journal_id,
      v_account_id,
      (v_line->>'cost_center_id')::uuid,
      v_line->>'description',
      (v_line->>'debit')::numeric,
      (v_line->>'credit')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_journal_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 8. Pay Milestone (Transactional: Receipt + Update Milestone + Journal)
CREATE OR REPLACE FUNCTION pay_milestone(
  p_milestone_id uuid,
  p_contract_id uuid,
  p_amount numeric,
  p_method text,
  p_user_id uuid,
  p_receipt_number text,
  p_contract_title text,
  p_client_name text,
  p_notes text
) RETURNS void AS $$
DECLARE
  v_cash_account_id uuid;
  v_ar_account_id uuid;
  v_journal_id uuid;
BEGIN
  -- 1. Create Receipt
  INSERT INTO receipts (
    receipt_number, contract_id, contract_title, milestone_id, 
    customer_name, amount, date, payment_method, notes
  ) VALUES (
    p_receipt_number, p_contract_id, p_contract_title, p_milestone_id,
    p_client_name, p_amount, now(), p_method, p_notes
  );

  -- 2. Update Milestone
  UPDATE contract_milestones 
  SET status = 'Paid', paid_at = now() 
  WHERE id = p_milestone_id;

  -- 3. Create Journal Entry (Auto-posting)
  -- Lookup Accounts
  SELECT id INTO v_cash_account_id FROM coa_accounts WHERE code = '1001'; -- Cash
  SELECT id INTO v_ar_account_id FROM coa_accounts WHERE code = '1100'; -- AR

  INSERT INTO journal_entries (
    entry_number, date, reference, description, status, created_by
  ) VALUES (
    'JE-' || p_receipt_number, now(), p_receipt_number, 
    'Receipt ' || p_receipt_number || ' - ' || p_client_name, 
    'POSTED', 'system' -- or p_user_id
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (journal_id, account_id, description, debit, credit)
  VALUES 
    (v_journal_id, v_cash_account_id, 'Cash Receipt', p_amount, 0),
    (v_journal_id, v_ar_account_id, 'AR Clearing', 0, p_amount);

END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
