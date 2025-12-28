-- Ensure contract milestones insert populates legacy title column

create or replace function create_contract(
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
    INSERT INTO contract_milestones (contract_id, title, name, amount_type, value, amount, due_date, trigger, status, tenant_id)
    SELECT
      v_contract_id,
      coalesce(x->>'name', x->>'title', 'Milestone'),
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
