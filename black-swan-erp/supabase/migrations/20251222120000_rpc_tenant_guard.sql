-- Tenant guard for legacy RPCs (SECURITY INVOKER)

CREATE OR REPLACE FUNCTION create_employee(
  p_employee jsonb,
  p_salary jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_emp_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO employees (
    first_name, last_name, email, phone, position, department,
    salary, join_date, status, iban, national_id, contract_type, system_role, tenant_id
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
    p_employee->>'national_id',
    p_employee->>'contract_type',
    p_employee->>'system_role',
    v_tenant
  ) RETURNING id INTO v_emp_id;

  INSERT INTO salary_structures (
    employee_id, basic_salary, housing_allowance,
    transport_allowance, other_allowances, effective_date, tenant_id
  ) VALUES (
    v_emp_id,
    (p_salary->>'basic_salary')::numeric,
    (p_salary->>'housing_allowance')::numeric,
    (p_salary->>'transport_allowance')::numeric,
    (p_salary->>'other_allowances')::numeric,
    (p_salary->>'effective_date')::timestamp,
    v_tenant
  );

  RETURN jsonb_build_object('id', v_emp_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_product(
  p_product jsonb,
  p_sizes jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_prod_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO products (
    sku, name, description, category, base_unit, sales_price,
    standard_cost, avg_cost, image_url, quality_level, sku_prefix, tenant_id
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
    p_product->>'sku_prefix',
    v_tenant
  ) RETURNING id INTO v_prod_id;

  IF jsonb_array_length(p_sizes) > 0 THEN
    INSERT INTO product_sizes (product_id, size, cost, price, tenant_id)
    SELECT
      v_prod_id,
      x->>'size',
      (x->>'cost')::numeric,
      (x->>'price')::numeric,
      v_tenant
    FROM jsonb_array_elements(p_sizes) x;
  END IF;

  RETURN jsonb_build_object('id', v_prod_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_contract(
  p_contract jsonb,
  p_items jsonb,
  p_milestones jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_contract_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO contracts (
    contract_number, title, client_id, status, total_value,
    start_date, delivery_date, notes, created_by, party_a, party_b, currency, tenant_id
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
    p_contract->>'currency',
    v_tenant
  ) RETURNING id INTO v_contract_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO contract_items (contract_id, product_name, quantity, unit_price, tenant_id)
    SELECT
      v_contract_id,
      x->>'product_name',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric,
      v_tenant
    FROM jsonb_array_elements(p_items) x;
  END IF;

  IF jsonb_array_length(p_milestones) > 0 THEN
    INSERT INTO contract_milestones (contract_id, name, amount_type, value, amount, due_date, trigger, status, tenant_id)
    SELECT
      v_contract_id,
      x->>'name',
      x->>'amount_type',
      (x->>'value')::numeric,
      (x->>'amount')::numeric,
      (x->>'due_date')::timestamp,
      x->>'trigger',
      x->>'status',
      v_tenant
    FROM jsonb_array_elements(p_milestones) x;
  END IF;

  RETURN jsonb_build_object('id', v_contract_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_quotation(
  p_quotation jsonb,
  p_items jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_quotation_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO quotations (
    quotation_number, customer_id, customer_name, customer_company, customer_phone,
    customer_email, customer_address, customer_vat, date, expiry_date,
    subtotal, vat_amount, total_amount, status, notes, tenant_id
  ) VALUES (
    p_quotation->>'quotation_number',
    (p_quotation->>'customer_id')::uuid,
    p_quotation->>'customer_name',
    p_quotation->>'customer_company',
    p_quotation->>'customer_phone',
    p_quotation->>'customer_email',
    p_quotation->>'customer_address',
    p_quotation->>'customer_vat',
    (p_quotation->>'date')::date,
    (p_quotation->>'expiry_date')::date,
    (p_quotation->>'subtotal')::numeric,
    (p_quotation->>'vat_amount')::numeric,
    (p_quotation->>'total_amount')::numeric,
    p_quotation->>'status',
    p_quotation->>'notes',
    v_tenant
  ) RETURNING id INTO v_quotation_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO quotation_items (quotation_id, description, quantity, unit_price, total, product_id, size_id, tenant_id)
    SELECT
      v_quotation_id,
      x->>'description',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric,
      (x->>'total')::numeric,
      (x->>'product_id')::uuid,
      (x->>'size_id')::uuid,
      v_tenant
    FROM jsonb_array_elements(p_items) x;
  END IF;

  RETURN jsonb_build_object('id', v_quotation_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_invoice(
  p_invoice jsonb,
  p_items jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_invoice_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO invoices (
    invoice_number, type, customer_id, issue_date, due_date,
    status, subtotal, vat_amount, total_amount, tenant_id
  ) VALUES (
    p_invoice->>'invoice_number',
    p_invoice->>'type',
    (p_invoice->>'customer_id')::uuid,
    (p_invoice->>'issue_date')::timestamp,
    (p_invoice->>'due_date')::timestamp,
    p_invoice->>'status',
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'vat_amount')::numeric,
    (p_invoice->>'total_amount')::numeric,
    v_tenant
  ) RETURNING id INTO v_invoice_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_rate, tenant_id)
    SELECT
      v_invoice_id,
      x->>'description',
      (x->>'quantity')::numeric,
      (x->>'unit_price')::numeric,
      (x->>'vat_rate')::numeric,
      v_tenant
    FROM jsonb_array_elements(p_items) x;
  END IF;

  RETURN jsonb_build_object('id', v_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION process_inventory_movement(
  p_product_id uuid,
  p_warehouse_id uuid,
  p_type text,
  p_quantity numeric,
  p_user_id uuid,
  p_tenant_id uuid
) RETURNS void AS $$
DECLARE
  v_current_qty numeric;
  v_stock_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  SELECT id, quantity INTO v_stock_id, v_current_qty
  FROM inventory_stock
  WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id AND tenant_id = v_tenant;

  IF v_stock_id IS NULL THEN
    INSERT INTO inventory_stock (product_id, warehouse_id, quantity, tenant_id)
    VALUES (p_product_id, p_warehouse_id, 0, v_tenant)
    RETURNING id, quantity INTO v_stock_id, v_current_qty;
  END IF;

  UPDATE inventory_stock
  SET quantity = quantity + p_quantity
  WHERE id = v_stock_id AND tenant_id = v_tenant;

  INSERT INTO inventory_movements (
    product_id, warehouse_id, type, quantity, date, user_id, tenant_id
  ) VALUES (
    p_product_id, p_warehouse_id, p_type, ABS(p_quantity), now(), p_user_id, v_tenant
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION pay_milestone(
  p_milestone_id uuid,
  p_contract_id uuid,
  p_amount numeric,
  p_method text,
  p_user_id uuid,
  p_receipt_number text,
  p_contract_title text,
  p_client_name text,
  p_notes text,
  p_tenant_id uuid
) RETURNS void AS $$
DECLARE
  v_cash_account_id uuid;
  v_ar_account_id uuid;
  v_journal_id uuid;
  v_tenant uuid := app.current_tenant_id();
BEGIN
  IF p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO receipts (
    receipt_number, contract_id, contract_title, customer_name, amount, date,
    payment_method, notes, tenant_id
  ) VALUES (
    p_receipt_number, p_contract_id, p_contract_title, p_client_name, p_amount,
    now(), p_method, p_notes, v_tenant
  );

  UPDATE contract_milestones
  SET status = 'PAID', paid_at = now()
  WHERE id = p_milestone_id AND contract_id = p_contract_id AND tenant_id = v_tenant;

  SELECT id INTO v_cash_account_id FROM coa_accounts WHERE code = '1001' AND tenant_id = v_tenant;
  SELECT id INTO v_ar_account_id FROM coa_accounts WHERE code = '1201' AND tenant_id = v_tenant;

  INSERT INTO journal_entries (
    entry_number, date, reference, description, status, created_by, tenant_id
  ) VALUES (
    concat('RCT-', right(p_receipt_number, 6)),
    now(),
    p_receipt_number,
    concat('Receipt for ', p_contract_title),
    'POSTED',
    p_user_id,
    v_tenant
  ) RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (journal_id, account_id, description, debit, credit, tenant_id)
  VALUES
    (v_journal_id, v_cash_account_id, 'Receipt', p_amount, 0, v_tenant),
    (v_journal_id, v_ar_account_id, 'Contract Receivable', 0, p_amount, v_tenant);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_approval_request(
  p_target_type text,
  p_target_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_priority text,
  p_payload jsonb
) RETURNS void AS $$
DECLARE
  v_tenant uuid := app.current_tenant_id();
BEGIN
  INSERT INTO approvals (
    type, title, description, requester_id, status, related_entity_id,
    amount, priority, target_type, target_id, payload, tenant_id
  ) VALUES (
    p_target_type,
    p_title,
    p_description,
    auth.uid(),
    'PENDING',
    p_target_id,
    p_amount,
    COALESCE(p_priority, 'MEDIUM'),
    p_target_type,
    p_target_id,
    p_payload,
    v_tenant
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION approval_decision(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_note text
) RETURNS void AS $$
DECLARE
  v_tenant uuid := app.current_tenant_id();
BEGIN
  UPDATE approvals
  SET
    status = CASE WHEN p_action = 'APPROVE' THEN 'APPROVED' ELSE 'REJECTED' END,
    decision_by = auth.uid(),
    decision_at = now(),
    decision_note = p_note,
    approver_id = auth.uid(),
    approved_at = CASE WHEN p_action = 'APPROVE' THEN now() ELSE approved_at END
  WHERE target_type = p_target_type
    AND target_id = p_target_id
    AND tenant_id = v_tenant
    AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
