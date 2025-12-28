import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const tenantId = process.env.TEST_TENANT_ID;

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

if (!url || !key || !tenantId) {
  fail('Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY, or TEST_TENANT_ID.');
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const compareSizes = (actual, expected) => {
  const norm = (rows) =>
    rows
      .map((r) => ({ size: r.size, cost: Number(r.cost), price: Number(r.price) }))
      .sort((a, b) => a.size.localeCompare(b.size));
  return JSON.stringify(norm(actual)) === JSON.stringify(norm(expected));
};

const run = async () => {
  const suffix = Date.now().toString().slice(-6);
  const baseProduct = {
    sku: `TEST-${suffix}`,
    name: `Test Product ${suffix}`,
    description: 'Verification product',
    category: 'Test',
    base_unit: 'PCS',
    sales_price: 100,
    standard_cost: 60,
    avg_cost: 60,
    image_url: null,
    quality_level: 'STANDARD',
    sku_prefix: 'TST',
  };

  const createSizes = [
    { size: 'S', cost: 10, price: 20 },
    { size: 'M', cost: 12, price: 24 },
  ];

  const { data: created, error: createError } = await supabase.rpc('create_product', {
    p_product: baseProduct,
    p_sizes: createSizes,
    p_tenant_id: tenantId,
  });

  if (createError) fail(`create_product failed: ${createError.message}`);

  const productId = created?.id;
  if (!productId) fail('create_product returned no product id.');

  const updateSizes = [
    { size: 'M', cost: 13, price: 26 },
    { size: 'L', cost: 14, price: 28 },
  ];

  const { error: updateError } = await supabase.rpc('update_product_with_sizes', {
    p_product_id: productId,
    p_product: { name: `Test Product ${suffix} Updated`, sales_price: 110 },
    p_sizes: updateSizes,
    p_tenant_id: tenantId,
  });

  if (updateError) fail(`update_product_with_sizes failed: ${updateError.message}`);

  const { data: productRow, error: productError } = await supabase
    .from('products')
    .select('id, name, sales_price')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single();

  if (productError) fail(`Fetching product failed: ${productError.message}`);

  const { data: sizeRows, error: sizeError } = await supabase
    .from('product_sizes')
    .select('size, cost, price')
    .eq('product_id', productId)
    .eq('tenant_id', tenantId);

  if (sizeError) fail(`Fetching sizes failed: ${sizeError.message}`);

  const productOk = productRow?.name?.includes('Updated') && Number(productRow?.sales_price) === 110;
  const sizesOk = compareSizes(sizeRows || [], updateSizes);

  if (!productOk) fail('Product fields did not update as expected.');
  if (!sizesOk) fail('Sizes in DB do not match expected payload.');

  await supabase.from('products').delete().eq('id', productId).eq('tenant_id', tenantId);

  console.log('PASS: Product create/update with sizes verified.');
};

run().catch((err) => fail(err.message || String(err)));
