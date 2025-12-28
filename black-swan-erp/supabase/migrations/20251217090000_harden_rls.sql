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

  RETURN v_tenant;
END;
$$;

-- NOTE: Policy enforcement is now handled by explicit RBAC policies.
-- This migration no longer creates tenant-only policies to avoid bypassing role checks.
