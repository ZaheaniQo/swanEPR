-- Update product with sizes atomically
CREATE OR REPLACE FUNCTION update_product_with_sizes(
  p_product_id uuid,
  p_product jsonb,
  p_sizes jsonb,
  p_tenant_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_prod_id uuid;
BEGIN
  IF p_tenant_id <> app.current_tenant_id() THEN
    RAISE EXCEPTION 'Tenant mismatch';
  END IF;

  UPDATE products
  SET
    sku = COALESCE(p_product->>'sku', sku),
    name = COALESCE(p_product->>'name', name),
    description = COALESCE(p_product->>'description', description),
    category = COALESCE(p_product->>'category', category),
    base_unit = COALESCE(p_product->>'base_unit', base_unit),
    sales_price = COALESCE((p_product->>'sales_price')::numeric, sales_price),
    standard_cost = COALESCE((p_product->>'standard_cost')::numeric, standard_cost),
    avg_cost = COALESCE((p_product->>'avg_cost')::numeric, avg_cost),
    image_url = COALESCE(p_product->>'image_url', image_url),
    quality_level = COALESCE(p_product->>'quality_level', quality_level),
    sku_prefix = COALESCE(p_product->>'sku_prefix', sku_prefix)
  WHERE id = p_product_id
    AND tenant_id = p_tenant_id
  RETURNING id INTO v_prod_id;

  IF v_prod_id IS NULL THEN
    RAISE EXCEPTION 'Product not found for tenant';
  END IF;

  IF p_sizes IS NOT NULL THEN
    DELETE FROM product_sizes
    WHERE product_id = v_prod_id
      AND tenant_id = p_tenant_id;

    IF jsonb_array_length(p_sizes) > 0 THEN
      INSERT INTO product_sizes (product_id, size, cost, price, tenant_id)
      SELECT
        v_prod_id,
        x->>'size',
        (x->>'cost')::numeric,
        (x->>'price')::numeric,
        p_tenant_id
      FROM jsonb_array_elements(p_sizes) x;
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_prod_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
