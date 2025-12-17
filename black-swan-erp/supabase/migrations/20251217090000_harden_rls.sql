-- Harden RLS to strict tenant isolation and remove permissive policies
-- Enforces tenant_id = current tenant (jwt.tenant_id or auth.uid fallback)
-- Applies to all public tables that have a tenant_id column

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant uuid;
  v_claims json;
BEGIN
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::json;
    v_tenant := nullif(v_claims ->> 'tenant_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_tenant := NULL;
  END;

  IF v_tenant IS NULL THEN
    v_tenant := auth.uid();
  END IF;

  RETURN v_tenant;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
  LOOP
    -- Ensure RLS is on
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Drop overly permissive policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_strict" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_strict" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_strict" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_strict" ON %I', tbl);

    -- Create strict tenant policies
    EXECUTE format('CREATE POLICY "tenant_select_strict" ON %I FOR SELECT USING (tenant_id = get_current_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_insert_strict" ON %I FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_update_strict" ON %I FOR UPDATE USING (tenant_id = get_current_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_delete_strict" ON %I FOR DELETE USING (tenant_id = get_current_tenant_id())', tbl);
  END LOOP;
END$$;
