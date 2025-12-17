-- Add contract duration, iqama and passport expiry to employees and update RPC

ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_duration_days INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS iqama_expiry DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_expiry DATE;

CREATE OR REPLACE FUNCTION create_employee(
  p_employee jsonb,
  p_salary jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_emp_id uuid;
BEGIN
  INSERT INTO employees (
    first_name, last_name, email, phone, position, department,
    salary, join_date, status, iban, national_id, contract_type,
    system_role, contract_duration_days, iqama_expiry, passport_expiry,
    tenant_id
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
    NULLIF(p_employee->>'contract_duration_days', '')::integer,
    (p_employee->>'iqama_expiry')::date,
    (p_employee->>'passport_expiry')::date,
    p_tenant_id
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
    p_tenant_id
  );

  RETURN jsonb_build_object('id', v_emp_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
