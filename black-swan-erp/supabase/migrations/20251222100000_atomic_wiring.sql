-- Ensure bill_of_materials is tenant-scoped
ALTER TABLE bill_of_materials
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT app.current_tenant_id();

UPDATE bill_of_materials
SET tenant_id = app.unassigned_tenant_id()
WHERE tenant_id IS NULL;

ALTER TABLE bill_of_materials
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bill_of_materials_tenant_id ON bill_of_materials(tenant_id);

-- Atomic BOM create (header + items)
CREATE OR REPLACE FUNCTION create_bom_with_items(
  p_bom jsonb,
  p_items jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_bom_id uuid;
BEGIN
  IF p_tenant_id <> app.current_tenant_id() THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO bill_of_materials (
    name,
    product_id,
    version,
    is_active,
    output_quantity,
    notes,
    tenant_id
  ) VALUES (
    p_bom->>'name',
    (p_bom->>'product_id')::uuid,
    p_bom->>'version',
    COALESCE((p_bom->>'is_active')::boolean, true),
    COALESCE((p_bom->>'output_quantity')::numeric, 1),
    p_bom->>'notes',
    p_tenant_id
  ) RETURNING id INTO v_bom_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO bom_items (
      bom_id,
      component_product_id,
      quantity,
      wastage_percent,
      tenant_id
    )
    SELECT
      v_bom_id,
      (x->>'component_product_id')::uuid,
      (x->>'quantity')::numeric,
      COALESCE((x->>'wastage_percent')::numeric, 0),
      p_tenant_id
    FROM jsonb_array_elements(p_items) x;
  END IF;

  RETURN jsonb_build_object('id', v_bom_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Atomic inventory adjustment (stock + movement)
CREATE OR REPLACE FUNCTION adjust_inventory_with_movement(
  p_product_id uuid,
  p_warehouse_id uuid,
  p_type text,
  p_quantity numeric,
  p_unit_cost numeric,
  p_user_id uuid,
  p_notes text,
  p_tenant_id uuid
) RETURNS void AS $$
DECLARE
  v_stock_id uuid;
  v_current_qty numeric;
BEGIN
  IF p_tenant_id <> app.current_tenant_id() THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  SELECT id, quantity
  INTO v_stock_id, v_current_qty
  FROM inventory_stock
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_stock_id IS NULL THEN
    INSERT INTO inventory_stock (product_id, warehouse_id, quantity, tenant_id)
    VALUES (p_product_id, p_warehouse_id, 0, p_tenant_id)
    RETURNING id, quantity INTO v_stock_id, v_current_qty;
  END IF;

  IF (v_current_qty + p_quantity) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  UPDATE inventory_stock
  SET quantity = quantity + p_quantity
  WHERE id = v_stock_id
    AND tenant_id = p_tenant_id;

  INSERT INTO inventory_movements (
    product_id,
    warehouse_id,
    type,
    quantity,
    unit_cost,
    date,
    user_id,
    notes,
    tenant_id
  ) VALUES (
    p_product_id,
    p_warehouse_id,
    p_type,
    ABS(p_quantity),
    p_unit_cost,
    now(),
    p_user_id,
    p_notes,
    p_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Atomic payroll run create (run + payslips)
CREATE OR REPLACE FUNCTION create_payroll_run_with_payslips(
  p_run jsonb,
  p_payslips jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_run_id uuid;
BEGIN
  IF p_tenant_id <> app.current_tenant_id() THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  INSERT INTO payroll_runs (
    month,
    year,
    status,
    total_amount,
    processed_at,
    tenant_id,
    created_by
  ) VALUES (
    (p_run->>'month')::int,
    (p_run->>'year')::int,
    p_run->>'status',
    (p_run->>'total_amount')::numeric,
    (p_run->>'processed_at')::timestamptz,
    p_tenant_id,
    (p_run->>'created_by')::uuid
  ) RETURNING id INTO v_run_id;

  IF jsonb_array_length(p_payslips) > 0 THEN
    INSERT INTO payslips (
      payroll_run_id,
      employee_id,
      basic_salary,
      total_allowances,
      total_deductions,
      net_salary,
      status,
      tenant_id,
      employee_name
    )
    SELECT
      v_run_id,
      (x->>'employee_id')::uuid,
      (x->>'basic_salary')::numeric,
      (x->>'total_allowances')::numeric,
      (x->>'total_deductions')::numeric,
      (x->>'net_salary')::numeric,
      x->>'status',
      p_tenant_id,
      x->>'employee_name'
    FROM jsonb_array_elements(p_payslips) x;
  END IF;

  RETURN jsonb_build_object('id', v_run_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
