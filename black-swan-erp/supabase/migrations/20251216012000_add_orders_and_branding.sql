-- Orders and Order Items + branding column for settings
-- Run after tenant_id migrations to ensure tenant column exists

-- 1) Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  type text CHECK (type in ('B2B','B2C')) NOT NULL,
  customer_type text,
  subtotal numeric(15,2) DEFAULT 0,
  vat_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  status text DEFAULT 'PENDING',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_tenant_r" ON orders;
DROP POLICY IF EXISTS "orders_tenant_w" ON orders;
DROP POLICY IF EXISTS "orders_tenant_r" ON orders;
CREATE POLICY "orders_tenant_r" ON orders
  FOR SELECT USING (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()));
CREATE POLICY "orders_tenant_w" ON orders
  FOR ALL USING (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()))
  WITH CHECK (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()));

-- 2) Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text,
  sku text,
  quantity numeric(12,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  line_total numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON order_items(tenant_id);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_tenant_r" ON order_items;
DROP POLICY IF EXISTS "order_items_tenant_w" ON order_items;
DROP POLICY IF EXISTS "order_items_tenant_r" ON order_items;
CREATE POLICY "order_items_tenant_r" ON order_items
  FOR SELECT USING (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()));
CREATE POLICY "order_items_tenant_w" ON order_items
  FOR ALL USING (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()))
  WITH CHECK (tenant_id = coalesce((auth.jwt() ->> 'tenant_id')::uuid, auth.uid()));

-- 3) Branding column on settings (jsonb)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS branding jsonb;
