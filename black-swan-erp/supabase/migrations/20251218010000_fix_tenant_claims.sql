-- Align tenant claim resolution and audit/profile hooks

CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.unassigned_tenant_id() RETURNS uuid AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant uuid;
  v_claims jsonb;
BEGIN
  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
  END;

  IF v_claims IS NOT NULL THEN
    v_tenant := NULLIF(v_claims->>'tenant_id', '')::uuid;
  END IF;

  RETURN v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  v_role := NULL;

  INSERT INTO public.profiles (id, email, status, tenant_id)
  VALUES (NEW.id, NEW.email, 'PENDING', app.unassigned_tenant_id());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant := COALESCE(OLD.tenant_id, get_current_tenant_id());
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, changed_by, tenant_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid(), v_tenant);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id, get_current_tenant_id());
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by, tenant_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid(), v_tenant);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant := COALESCE(NEW.tenant_id, get_current_tenant_id());
    INSERT INTO audit_logs (table_name, record_id, operation, new_data, changed_by, tenant_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid(), v_tenant);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "receipts_tenant_r" ON receipts';
    EXECUTE 'DROP POLICY IF EXISTS "receipts_tenant_w" ON receipts';
    EXECUTE 'CREATE POLICY "receipts_tenant_r" ON receipts FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "receipts_tenant_w" ON receipts FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'receipts table not found, skipping receipts policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "orders_tenant_r" ON orders';
    EXECUTE 'DROP POLICY IF EXISTS "orders_tenant_w" ON orders';
    EXECUTE 'CREATE POLICY "orders_tenant_r" ON orders FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "orders_tenant_w" ON orders FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'orders table not found, skipping orders policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "order_items_tenant_r" ON order_items';
    EXECUTE 'DROP POLICY IF EXISTS "order_items_tenant_w" ON order_items';
    EXECUTE 'CREATE POLICY "order_items_tenant_r" ON order_items FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "order_items_tenant_w" ON order_items FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'order_items table not found, skipping order_items policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "settings_tenant_r" ON settings';
    EXECUTE 'DROP POLICY IF EXISTS "settings_tenant_w" ON settings';
    EXECUTE 'CREATE POLICY "settings_tenant_r" ON settings FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "settings_tenant_w" ON settings FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'settings table not found, skipping settings policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "invoices_tenant_r" ON invoices';
    EXECUTE 'DROP POLICY IF EXISTS "invoices_tenant_w" ON invoices';
    EXECUTE 'CREATE POLICY "invoices_tenant_r" ON invoices FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "invoices_tenant_w" ON invoices FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'invoices table not found, skipping invoices policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_tenant_r" ON invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_tenant_w" ON invoice_items';
    EXECUTE 'CREATE POLICY "invoice_items_tenant_r" ON invoice_items FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "invoice_items_tenant_w" ON invoice_items FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'invoice_items table not found, skipping invoice_items policies';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "disbursements_tenant_r" ON disbursements';
    EXECUTE 'DROP POLICY IF EXISTS "disbursements_tenant_w" ON disbursements';
    EXECUTE 'CREATE POLICY "disbursements_tenant_r" ON disbursements FOR SELECT USING (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "disbursements_tenant_w" ON disbursements FOR ALL USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id())';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'disbursements table not found, skipping disbursements policies';
  END;
END $$;

