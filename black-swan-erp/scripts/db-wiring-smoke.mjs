import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tenantId = process.env.TEST_TENANT_ID;
const otherTenantId = process.env.TEST_TENANT_ID_2 || '00000000-0000-0000-0000-000000000000';
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

if (!url || !anonKey || !tenantId) {
  fail('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or TEST_TENANT_ID.');
}

if (!email || !password) {
  fail('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD for RLS validation.');
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const getAdminUserByEmail = async (client, targetEmail) => {
  if (!client) return { user: null };

  if (client.auth?.admin?.getUserByEmail) {
    const { data, error } = await client.auth.admin.getUserByEmail(targetEmail);
    if (error) throw error;
    return { user: data?.user || null };
  }

  if (client.auth?.getUserByEmail) {
    const { data, error } = await client.auth.getUserByEmail(targetEmail);
    if (error) throw error;
    return { user: data?.user || null };
  }

  if (client.auth?.admin?.listUsers) {
    const { data, error } = await client.auth.admin.listUsers();
    if (error) throw error;
    const user = (data?.users || []).find((u) => u.email === targetEmail) || null;
    return { user };
  }

  throw new Error('Admin API does not expose user lookup methods.');
};

const run = async () => {
  const suffix = Date.now().toString().slice(-6);
  const addedRoleIds = [];
  const addedPermissionIds = [];
  let addedMembership = false;
  let sessionInserted = false;
  let sessionId = null;
  let previousActiveTenantIds = [];
  let preUserId = null;
  let createdWorkOrderId = null;
  let createdWorkOrderNumber = null;

  if (admin) {
    try {
      const { user } = await getAdminUserByEmail(admin, email);
      preUserId = user?.id || null;
    } catch (error) {
      fail(`Admin lookup failed: ${error.message || String(error)}`);
    }
    if (!preUserId) {
      fail('Admin lookup returned no user id for test email.');
    }
    if (preUserId) {
      const { data: existingMembership, error: existingMembershipErr } = await admin
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', preUserId)
        .eq('tenant_id', tenantId)
        .limit(1);
      if (existingMembershipErr) fail(`Check user_tenants failed: ${existingMembershipErr.message}`);
      if (!existingMembership?.length) {
        const { error: insertMembershipErr } = await admin.from('user_tenants').insert({
          user_id: preUserId,
          tenant_id: tenantId,
          status: 'ACTIVE',
          is_default: true,
          active: true,
        });
        if (insertMembershipErr) fail(`Insert user_tenants failed: ${insertMembershipErr.message}`);
        addedMembership = true;
        console.log('INFO: Added temporary user_tenants membership for test user.');
      }

      const { data: activeRows, error: activeRowsErr } = await admin
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', preUserId)
        .eq('active', true);
      if (activeRowsErr) fail(`Read active tenant failed: ${activeRowsErr.message}`);
      previousActiveTenantIds = (activeRows || []).map((row) => row.tenant_id);

      const { error: deactivateErr } = await admin
        .from('user_tenants')
        .update({ active: false })
        .eq('user_id', preUserId);
      if (deactivateErr) fail(`Reset active tenant failed: ${deactivateErr.message}`);

      const { error: activateErr } = await admin
        .from('user_tenants')
        .update({ active: true, is_default: true })
        .eq('user_id', preUserId)
        .eq('tenant_id', tenantId);
      if (activateErr) fail(`Set active tenant failed: ${activateErr.message}`);

      const { data: existingSession, error: existingSessionErr } = await admin
        .from('user_tenant_sessions')
        .select('id')
        .eq('user_id', preUserId)
        .eq('tenant_id', tenantId)
        .limit(1);
      if (existingSessionErr) fail(`Check user_tenant_sessions failed: ${existingSessionErr.message}`);
      if (!existingSession?.length) {
        const { data: newSession, error: sessionErr } = await admin
          .from('user_tenant_sessions')
          .insert({ user_id: preUserId, tenant_id: tenantId, last_selected_at: new Date().toISOString() })
          .select('id')
          .single();
        if (sessionErr) fail(`Insert user_tenant_sessions failed: ${sessionErr.message}`);
        sessionInserted = true;
        sessionId = newSession?.id || null;
      } else {
        await admin
          .from('user_tenant_sessions')
          .update({ last_selected_at: new Date().toISOString() })
          .eq('id', existingSession[0].id);
      }
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) fail(`Sign-in failed: ${signInError.message}`);

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) fail(`Get session failed: ${sessionErr.message}`);
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) fail('Missing access token after sign-in.');
  const tokenPayload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString('utf8'));
  const tokenTenantId = tokenPayload?.tenant_id || null;
  const logTokenDiagnostics = (payload) => {
    if (!payload || typeof payload !== 'object') {
      console.log('INFO: JWT payload missing or invalid.');
      return;
    }
    const safeKeys = new Set(['tenant_id', 'role', 'sub', 'iss', 'aud', 'exp', 'iat']);
    const snapshot = {};
    for (const key of Object.keys(payload).sort()) {
      snapshot[key] = safeKeys.has(key) ? payload[key] : '[redacted]';
    }
    console.log('INFO: JWT claims snapshot (redacted):', snapshot);
  };
  if (!tokenTenantId) {
    console.error(
      'ERROR: JWT tenant_id claim missing. The Custom Access Token Hook is not enabled in Supabase Studio.'
    );
    console.error('ACTION: Enable the hook and re-login. See docs/AUTH_HOOK_ENABLEMENT.md.');
    logTokenDiagnostics(tokenPayload);
    fail('JWT tenant_id claim missing in access token.');
  }
  if (tokenTenantId !== tenantId) {
    console.log(`WARN: JWT tenant_id (${tokenTenantId}) differs from TEST_TENANT_ID (${tenantId}).`);
  }
  const effectiveTenantId = tokenTenantId;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) fail(`Fetch user failed: ${userErr.message}`);
  const userId = userData?.user?.id;
  assert(userId, 'Authenticated user id missing');

  if (admin) {
    const { data: membershipRows, error: membershipErr } = await admin
      .from('user_tenants')
      .select('user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', effectiveTenantId)
      .limit(1);
    if (membershipErr) fail(`Check user_tenants failed: ${membershipErr.message}`);
    if (!membershipRows?.length) {
      const { error: insertMembershipErr } = await admin.from('user_tenants').insert({
        user_id: userId,
        tenant_id: effectiveTenantId,
        status: 'ACTIVE',
        is_default: true,
      });
      if (insertMembershipErr) fail(`Insert user_tenants failed: ${insertMembershipErr.message}`);
      addedMembership = true;
      console.log('INFO: Added temporary user_tenants membership for test user.');
    }
    const { error: defaultErr } = await admin
      .from('user_tenants')
      .update({ is_default: false })
      .eq('user_id', userId)
      .neq('tenant_id', effectiveTenantId);
    if (defaultErr) fail(`Reset default tenant failed: ${defaultErr.message}`);
    const { error: setDefaultErr } = await admin
      .from('user_tenants')
      .update({ is_default: true })
      .eq('user_id', userId)
      .eq('tenant_id', effectiveTenantId);
    if (setDefaultErr) fail(`Set default tenant failed: ${setDefaultErr.message}`);
    const { error: deactivateActiveErr } = await admin
      .from('user_tenants')
      .update({ active: false })
      .eq('user_id', userId);
    if (deactivateActiveErr) fail(`Reset active tenant failed: ${deactivateActiveErr.message}`);
    const { error: activateActiveErr } = await admin
      .from('user_tenants')
      .update({ active: true })
      .eq('user_id', userId)
      .eq('tenant_id', effectiveTenantId);
    if (activateActiveErr) fail(`Set active tenant failed: ${activateActiveErr.message}`);

    const requiredRoles = ['SUPER_ADMIN', 'CEO', 'ACCOUNTING', 'WAREHOUSE', 'PRODUCTION_MANAGER', 'HR'];
    const { data: roles, error: rolesErr } = await admin
      .from('roles')
      .select('id, name')
      .in('name', requiredRoles);
    if (rolesErr) fail(`Fetch roles failed: ${rolesErr.message}`);

    let superAdminRoleId = null;
    for (const role of roles || []) {
      const { data: existingRole, error: existingRoleErr } = await admin
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('tenant_id', effectiveTenantId)
        .eq('role_id', role.id)
        .limit(1);
      if (existingRoleErr) fail(`Check user_roles failed: ${existingRoleErr.message}`);
      if (!existingRole?.length) {
        const { error: insertRoleErr } = await admin.from('user_roles').insert({
          user_id: userId,
          role_id: role.id,
          tenant_id: effectiveTenantId,
        });
        if (insertRoleErr) fail(`Insert user_roles failed: ${insertRoleErr.message}`);
        addedRoleIds.push(role.id);
      }
      if (role.name === 'SUPER_ADMIN') {
        superAdminRoleId = role.id;
      }
    }
    if (addedRoleIds.length) {
      console.log(`INFO: Added temporary roles for test user: ${addedRoleIds.length}`);
    }

    if (superAdminRoleId) {
      const { data: permissions, error: permissionsErr } = await admin
        .from('permissions')
        .select('id');
      if (permissionsErr) fail(`Fetch permissions failed: ${permissionsErr.message}`);

      const { data: existingPerms, error: existingPermsErr } = await admin
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', superAdminRoleId);
      if (existingPermsErr) fail(`Fetch role_permissions failed: ${existingPermsErr.message}`);

      const existingPermissionIds = new Set((existingPerms || []).map((row) => row.permission_id));
      const missingPermissionIds = (permissions || [])
        .map((row) => row.id)
        .filter((id) => !existingPermissionIds.has(id));

      if (missingPermissionIds.length) {
        const inserts = missingPermissionIds.map((permission_id) => ({
          role_id: superAdminRoleId,
          permission_id,
        }));
        const { error: insertPermsErr } = await admin.from('role_permissions').insert(inserts);
        if (insertPermsErr) fail(`Insert role_permissions failed: ${insertPermsErr.message}`);
        addedPermissionIds.push(...missingPermissionIds);
        console.log(`INFO: Added ${missingPermissionIds.length} permissions to SUPER_ADMIN for tests.`);
      }
    }

    const ensureCoaAccount = async ({ code, name, type, subtype }) => {
      const { data: existingRows, error: existingErr } = await admin
        .from('coa_accounts')
        .select('id, tenant_id')
        .eq('code', code)
        .limit(1);
      if (existingErr) fail(`Fetch coa_accounts failed: ${existingErr.message}`);
      if (existingRows?.length) {
        const row = existingRows[0];
        if (!row.tenant_id) {
          const { error: updateErr } = await admin
            .from('coa_accounts')
            .update({ tenant_id: effectiveTenantId })
            .eq('id', row.id);
          if (updateErr) fail(`Update coa_accounts ${code} failed: ${updateErr.message}`);
          return row.id;
        }
        if (row.tenant_id !== effectiveTenantId) {
          fail(`COA account code ${code} belongs to another tenant (${row.tenant_id}).`);
        }
        return row.id;
      }

      const { data: inserted, error: insertErr } = await admin
        .from('coa_accounts')
        .insert({
          code,
          name,
          type,
          subtype,
          tenant_id: effectiveTenantId,
          is_system: true,
        })
        .select('id')
        .single();
      if (insertErr) fail(`Insert coa_accounts ${code} failed: ${insertErr.message}`);
      return inserted?.id;
    };

    await ensureCoaAccount({
      code: '1200',
      name: 'Inventory Asset',
      type: 'ASSET',
      subtype: 'Inventory',
    });
    await ensureCoaAccount({
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      subtype: 'COGS',
    });
  }

  const listTables = [
    'customers',
    'suppliers',
    'products',
    'product_sizes',
    'quotations',
    'quotation_items',
    'contracts',
    'contract_items',
    'receipts',
    'disbursements',
    'invoices',
    'invoice_items',
    'inventory_stock',
    'inventory_movements',
    'work_orders',
    'bill_of_materials',
    'bom_items',
    'payroll_runs',
    'payslips',
    'employees',
    'leaves',
    'assets',
    'asset_categories',
    'projects',
    'project_stages',
    'approvals',
    'settings',
  ];

  for (const table of listTables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .eq('tenant_id', effectiveTenantId)
      .limit(1);
    if (error) fail(`Select failed for ${table}: ${error.message}`);
  }

  // --- Product + Sizes ---
  const productPayload = {
    sku: `TEST-${suffix}`,
    name: `Smoke Product ${suffix}`,
    description: 'Smoke product',
    category: 'Test',
    base_unit: 'PCS',
    sales_price: 100,
    standard_cost: 60,
    avg_cost: 60,
    image_url: null,
    quality_level: 'STANDARD',
    sku_prefix: 'SMK',
  };

  const productSizes = [
    { size: 'S', cost: 10, price: 20 },
    { size: 'M', cost: 12, price: 24 },
  ];

  const { data: productCreate, error: productCreateErr } = await supabase.rpc('create_product', {
    p_product: productPayload,
    p_sizes: productSizes,
    p_tenant_id: effectiveTenantId,
  });
  if (productCreateErr) fail(`create_product failed: ${productCreateErr.message}`);
  const productId = productCreate?.id;
  assert(productId, 'create_product returned no id');

  const updatedSizes = [
    { size: 'M', cost: 13, price: 26 },
    { size: 'L', cost: 14, price: 28 },
  ];

  const { error: productUpdateErr } = await supabase.rpc('update_product_with_sizes', {
    p_product_id: productId,
    p_product: { name: `Smoke Product ${suffix} Updated`, sales_price: 110 },
    p_sizes: updatedSizes,
    p_tenant_id: effectiveTenantId,
  });
  if (productUpdateErr) fail(`update_product_with_sizes failed: ${productUpdateErr.message}`);

  const { data: sizeRows, error: sizeFetchErr } = await supabase
    .from('product_sizes')
    .select('size, cost, price')
    .eq('product_id', productId)
    .eq('tenant_id', effectiveTenantId);
  if (sizeFetchErr) fail(`Fetching product sizes failed: ${sizeFetchErr.message}`);
  assert(sizeRows?.length === 2, 'Sizes did not update to expected count');

  // --- Customer (for invoices + contracts) ---
  const { data: customerRow, error: customerErr } = await supabase
    .from('customers')
    .insert({
      name: `Smoke Customer ${suffix}`,
      company_name: `Smoke Co ${suffix}`,
      email: `smoke-${suffix}@example.com`,
      phone: '0500000000',
      tenant_id: effectiveTenantId,
    })
    .select('id')
    .single();
  if (customerErr) fail(`Customer insert failed: ${customerErr.message}`);
  const customerId = customerRow?.id;

  // --- Supplier + Disbursement + Receipt ---
  const { data: supplierRow, error: supplierErr } = await supabase
    .from('suppliers')
    .insert({
      name: `Smoke Supplier ${suffix}`,
      contact_person: `Contact ${suffix}`,
      email: `supplier-${suffix}@example.com`,
      phone: '0500000000',
      type: 'General',
      tenant_id: effectiveTenantId,
    })
    .select('id')
    .single();
  if (supplierErr) fail(`Supplier insert failed: ${supplierErr.message}`);

  const { error: disbErr } = await supabase.from('disbursements').insert({
    description: 'Smoke disbursement',
    amount: 50,
    date: new Date().toISOString().slice(0, 10),
    category: 'Ops',
    payment_method: 'Cash',
    status: 'PENDING',
    supplier_id: supplierRow?.id,
    tenant_id: effectiveTenantId,
  });
  if (disbErr) fail(`Disbursement insert failed: ${disbErr.message}`);

  const { error: receiptErr } = await supabase.from('receipts').insert({
    receipt_number: `RCT-${suffix}`,
    customer_name: `Smoke Customer ${suffix}`,
    amount: 25,
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'Cash',
    tenant_id: effectiveTenantId,
  });
  if (receiptErr) fail(`Receipt insert failed: ${receiptErr.message}`);

  // --- Invoice + Items ---
  const { data: invoiceRow, error: invoiceErr } = await supabase.rpc('create_invoice_secure', {
    p_invoice: {
      type: 'Standard',
      customer_id: customerId,
      buyer: { name: 'Smoke Buyer', legalName: 'Smoke Buyer', vatNumber: '123456789012345' },
      currency: 'SAR',
      issue_date: new Date().toISOString(),
      status: 'APPROVED',
      subtotal: 100,
      vat_amount: 15,
      total_amount: 115,
    },
    p_items: [{ description: 'Smoke Item', quantity: 1, unit_price: 100, vat_rate: 0.15 }],
  });
  if (invoiceErr) fail(`create_invoice_secure failed: ${invoiceErr.message}`);
  const invoiceId = invoiceRow?.id;
  assert(invoiceId, 'create_invoice_secure returned no id');

  const { error: postErr } = await supabase.rpc('post_invoice_secure', {
    p_invoice_id: invoiceId,
  });
  if (postErr) fail(`post_invoice_secure failed: ${postErr.message}`);

  // --- Quotation + Conversion to Contract ---
  const { data: quotationRow, error: quotationErr } = await supabase.rpc('create_quotation', {
    p_quotation: {
      quotation_number: `Q-${suffix}`,
      customer_id: customerId,
      customer_name: `Smoke Customer ${suffix}`,
      customer_company: `Smoke Co ${suffix}`,
      customer_phone: '0500000000',
      customer_email: `smoke-${suffix}@example.com`,
      customer_address: 'Smoke Address',
      customer_vat: '123456789012345',
      date: new Date().toISOString().slice(0, 10),
      expiry_date: new Date().toISOString().slice(0, 10),
      subtotal: 100,
      vat_amount: 15,
      total_amount: 115,
      status: 'PENDING',
      notes: 'Smoke quotation',
    },
    p_items: [{ description: 'Smoke item', quantity: 1, unit_price: 100, total: 115 }],
    p_tenant_id: effectiveTenantId,
  });
  if (quotationErr) fail(`create_quotation failed: ${quotationErr.message}`);
  const quotationId = quotationRow?.id;
  assert(quotationId, 'create_quotation returned no id');

  const { data: contractRow, error: contractErr } = await supabase.rpc('create_contract', {
    p_contract: {
      contract_number: `CN-${suffix}`,
      title: `Smoke Contract ${suffix}`,
      client_id: customerId,
      status: 'Draft',
      total_value: 1000,
      start_date: new Date().toISOString(),
      delivery_date: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id,
      currency: 'SAR',
    },
    p_items: [{ product_name: 'Smoke Item', quantity: 1, unit_price: 1000 }],
    p_milestones: [{ name: 'First', amount_type: 'Fixed', value: 1000, amount: 1000, status: 'Pending' }],
    p_tenant_id: effectiveTenantId,
  });
  if (contractErr) fail(`create_contract failed: ${contractErr.message}`);
  const contractId = contractRow?.id;
  assert(contractId, 'create_contract returned no id');

  const { error: quotationUpdateErr } = await supabase
    .from('quotations')
    .update({ status: 'CONVERTED' })
    .eq('id', quotationId)
    .eq('tenant_id', effectiveTenantId);
  if (quotationUpdateErr) fail(`Quotation status update failed: ${quotationUpdateErr.message}`);

  // --- BOM + Items ---
  const { data: bomRow, error: bomErr } = await supabase.rpc('create_bom_with_items', {
    p_bom: { name: `BOM ${suffix}`, product_id: productId, version: '1.0', is_active: true, output_quantity: 1 },
    p_items: [{ component_product_id: productId, quantity: 1, wastage_percent: 0 }],
    p_tenant_id: effectiveTenantId,
  });
  if (bomErr) fail(`create_bom_with_items failed: ${bomErr.message}`);
  const bomId = bomRow?.id;
  assert(bomId, 'create_bom_with_items returned no id');

  // --- Warehouse + Inventory Adjustment (seed stock) ---
  const { data: warehouseRow, error: warehouseErr } = await supabase
    .from('warehouses')
    .insert({ name: `Smoke Warehouse ${suffix}`, code: `WH-${suffix}`, tenant_id: effectiveTenantId })
    .select('id')
    .single();
  if (warehouseErr) fail(`Warehouse insert failed: ${warehouseErr.message}`);

  const { error: adjustErr } = await supabase.rpc('adjust_inventory_with_movement', {
    p_product_id: productId,
    p_warehouse_id: warehouseRow?.id,
    p_type: 'ADJUSTMENT_IN',
    p_quantity: 10,
    p_unit_cost: 10,
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_notes: 'Smoke adjust',
    p_tenant_id: effectiveTenantId,
  });
  if (adjustErr) fail(`adjust_inventory_with_movement failed: ${adjustErr.message}`);

  // --- Work Order + Completion (idempotent) ---
  const workOrderNumber = `WO-${suffix}`;
  const { data: workOrderRow, error: workOrderErr } = await supabase
    .from('work_orders')
    .insert({
      number: workOrderNumber,
      bom_id: bomId,
      product_id: productId,
      warehouse_id: warehouseRow?.id,
      quantity_planned: 1,
      quantity_produced: 1,
      status: 'IN_PROGRESS',
      tenant_id: effectiveTenantId,
    })
    .select('id')
    .single();
  if (workOrderErr) fail(`Work order insert failed: ${workOrderErr.message}`);
  const workOrderId = workOrderRow?.id;
  assert(workOrderId, 'Work order insert returned no id');
  createdWorkOrderId = workOrderId;
  createdWorkOrderNumber = workOrderNumber;

  const idempotencyKey = `wo-${suffix}`;
  const { data: completionResult1, error: completeErr1 } = await supabase.rpc('complete_work_order', {
    p_work_order_id: workOrderId,
    p_completed_at: new Date().toISOString(),
    p_notes: 'Smoke completion',
    p_idempotency_key: idempotencyKey,
  });
  if (completeErr1) fail(`complete_work_order failed: ${completeErr1.message}`);
  assert(completionResult1?.work_order_id === workOrderId, 'complete_work_order returned wrong work_order_id');

  const { count: movementCount1, error: movementCountErr1 } = await supabase
    .from('inventory_movements')
    .select('id', { count: 'exact', head: true })
    .eq('reference_type', 'WORK_ORDER')
    .eq('reference_id', workOrderId)
    .eq('tenant_id', effectiveTenantId);
  if (movementCountErr1) fail(`Inventory movement count failed: ${movementCountErr1.message}`);

  const { count: journalCount1, error: journalCountErr1 } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('reference', workOrderNumber)
    .eq('tenant_id', effectiveTenantId);
  if (journalCountErr1) fail(`Journal entry count failed: ${journalCountErr1.message}`);

  const { data: completionResult2, error: completeErr2 } = await supabase.rpc('complete_work_order', {
    p_work_order_id: workOrderId,
    p_completed_at: new Date().toISOString(),
    p_notes: 'Smoke completion',
    p_idempotency_key: idempotencyKey,
  });
  if (completeErr2) fail(`complete_work_order idempotency failed: ${completeErr2.message}`);
  assert(
    completionResult2?.journal_entry_id === completionResult1?.journal_entry_id,
    'Idempotent completion returned different journal_entry_id'
  );

  const { count: movementCount2, error: movementCountErr2 } = await supabase
    .from('inventory_movements')
    .select('id', { count: 'exact', head: true })
    .eq('reference_type', 'WORK_ORDER')
    .eq('reference_id', workOrderId)
    .eq('tenant_id', effectiveTenantId);
  if (movementCountErr2) fail(`Inventory movement count (2) failed: ${movementCountErr2.message}`);
  assert(movementCount2 === movementCount1, 'Inventory movements changed after idempotent completion');

  const { count: journalCount2, error: journalCountErr2 } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('reference', workOrderNumber)
    .eq('tenant_id', effectiveTenantId);
  if (journalCountErr2) fail(`Journal entry count (2) failed: ${journalCountErr2.message}`);
  assert(journalCount2 === journalCount1, 'Journal entries changed after idempotent completion');

  // --- Payroll Run + Payslips ---
  const { data: employeeRow, error: employeeErr } = await supabase
    .from('employees')
    .insert({
      first_name: 'Smoke',
      last_name: `User ${suffix}`,
      status: 'ACTIVE',
      join_date: new Date().toISOString().slice(0, 10),
      tenant_id: effectiveTenantId,
    })
    .select('id')
    .single();
  if (employeeErr) fail(`Employee insert failed: ${employeeErr.message}`);
  const employeeId = employeeRow?.id;

  const { data: payrollRow, error: payrollErr } = await supabase.rpc('create_payroll_run_with_payslips', {
    p_run: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'PROCESSED',
      total_amount: 1000,
      processed_at: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id,
    },
    p_payslips: [
      {
        employee_id: employeeId,
        basic_salary: 800,
        total_allowances: 200,
        total_deductions: 0,
        net_salary: 1000,
        status: 'PENDING',
        employee_name: 'Smoke User',
      },
    ],
    p_tenant_id: effectiveTenantId,
  });
  if (payrollErr) fail(`create_payroll_run_with_payslips failed: ${payrollErr.message}`);
  assert(payrollRow?.id, 'create_payroll_run_with_payslips returned no id');

  // --- Cross-tenant negative check ---
  const { data: crossTenantRows, error: crossTenantErr } = await supabase
    .from('products')
    .select('id')
    .eq('tenant_id', otherTenantId)
    .limit(1);
  if (crossTenantErr) fail(`Cross-tenant query failed: ${crossTenantErr.message}`);
  assert((crossTenantRows || []).length === 0, 'Cross-tenant query returned data (RLS failure)');

  // --- Cleanup (best-effort) ---
  if (admin) {
    if (createdWorkOrderId) {
      await admin.from('work_order_completion_requests').delete().eq('work_order_id', createdWorkOrderId);
      await admin.from('inventory_movements').delete().eq('reference_type', 'WORK_ORDER').eq('reference_id', createdWorkOrderId);
    }
    if (createdWorkOrderNumber) {
      await admin.from('journal_entries').delete().eq('reference', createdWorkOrderNumber).eq('tenant_id', effectiveTenantId);
    }
    await admin.from('payroll_runs').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('employees').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('work_orders').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('bill_of_materials').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('contracts').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('quotations').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('invoices').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('disbursements').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('receipts').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('suppliers').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('customers').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('products').delete().eq('tenant_id', effectiveTenantId);
    await admin.from('warehouses').delete().eq('tenant_id', effectiveTenantId);
    if (addedPermissionIds.length) {
      const { data: superAdminRole } = await admin
        .from('roles')
        .select('id')
        .eq('name', 'SUPER_ADMIN')
        .maybeSingle();
      if (superAdminRole?.id) {
        await admin
          .from('role_permissions')
          .delete()
          .eq('role_id', superAdminRole.id)
          .in('permission_id', addedPermissionIds);
        console.log('INFO: Removed temporary role_permissions grants.');
      }
    }
    if (addedRoleIds.length) {
      await admin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', effectiveTenantId)
        .in('role_id', addedRoleIds);
      console.log('INFO: Removed temporary user_roles grants.');
    }
    if (addedMembership) {
      await admin.from('user_tenants').delete().eq('user_id', userId).eq('tenant_id', effectiveTenantId);
      console.log('INFO: Removed temporary user_tenants membership.');
    }
    if (sessionInserted && sessionId) {
      await admin.from('user_tenant_sessions').delete().eq('id', sessionId);
      console.log('INFO: Removed temporary user_tenant_sessions row.');
    }
    if (previousActiveTenantIds.length) {
      await admin.from('user_tenants').update({ active: false }).eq('user_id', userId);
      await admin.from('user_tenants').update({ active: true }).eq('user_id', userId).in('tenant_id', previousActiveTenantIds);
      console.log('INFO: Restored previous active tenant selection.');
    }
  }

  console.log('PASS: DB wiring smoke suite completed.');
};

run().catch((err) => fail(err.message || String(err)));
