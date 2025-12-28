-- RLS: enforce tenant + role, and protect profile sensitive fields

-- Profiles: self access + admin visibility within tenant
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Enable all access for authenticated users" on public.profiles;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

create or replace function app.prevent_profile_sensitive_updates()
returns trigger as $$
begin
  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.status is distinct from old.status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at then
    if auth.role() = 'service_role' or public.has_any_role(array['SUPER_ADMIN','CEO']) then
      return new;
    end if;
    raise exception 'Profile role/tenant/status updates require admin privileges';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_profile_sensitive_updates on public.profiles;
create trigger prevent_profile_sensitive_updates
before update on public.profiles
for each row execute function app.prevent_profile_sensitive_updates();

-- User roles are server-managed
alter table public.user_roles enable row level security;
drop policy if exists "User roles select" on public.user_roles;
drop policy if exists "User roles insert" on public.user_roles;
drop policy if exists "User roles update" on public.user_roles;
drop policy if exists "User roles delete" on public.user_roles;

create policy user_roles_select_self on public.user_roles
for select using (auth.role() = 'service_role' or auth.uid() = user_id);

create policy user_roles_write_service on public.user_roles
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Tenant + role policies (feature-aligned)
-- Products
drop policy if exists products_select on public.products;
create policy products_select on public.products
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists products_insert on public.products;
create policy products_insert on public.products
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);
drop policy if exists products_update on public.products;
create policy products_update on public.products
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);
drop policy if exists products_delete on public.products;
create policy products_delete on public.products
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);

drop policy if exists product_sizes_select on public.product_sizes;
create policy product_sizes_select on public.product_sizes
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists product_sizes_insert on public.product_sizes;
create policy product_sizes_insert on public.product_sizes
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);
drop policy if exists product_sizes_update on public.product_sizes;
create policy product_sizes_update on public.product_sizes
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);
drop policy if exists product_sizes_delete on public.product_sizes;
create policy product_sizes_delete on public.product_sizes
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);

-- Quotations
drop policy if exists quotations_select on public.quotations;
create policy quotations_select on public.quotations
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotations_insert on public.quotations;
create policy quotations_insert on public.quotations
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotations_update on public.quotations;
create policy quotations_update on public.quotations
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotations_delete on public.quotations;
create policy quotations_delete on public.quotations
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

drop policy if exists quotation_items_select on public.quotation_items;
create policy quotation_items_select on public.quotation_items
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotation_items_insert on public.quotation_items;
create policy quotation_items_insert on public.quotation_items
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotation_items_update on public.quotation_items;
create policy quotation_items_update on public.quotation_items
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists quotation_items_delete on public.quotation_items;
create policy quotation_items_delete on public.quotation_items
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

-- Contracts
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING','PRODUCTION_MANAGER'])
);
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contracts_delete on public.contracts;
create policy contracts_delete on public.contracts
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);

drop policy if exists contract_items_select on public.contract_items;
create policy contract_items_select on public.contract_items
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING','PRODUCTION_MANAGER'])
);
drop policy if exists contract_items_insert on public.contract_items;
create policy contract_items_insert on public.contract_items
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contract_items_update on public.contract_items;
create policy contract_items_update on public.contract_items
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contract_items_delete on public.contract_items;
create policy contract_items_delete on public.contract_items
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);

drop policy if exists contract_milestones_select on public.contract_milestones;
create policy contract_milestones_select on public.contract_milestones
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING','PRODUCTION_MANAGER'])
);
drop policy if exists contract_milestones_insert on public.contract_milestones;
create policy contract_milestones_insert on public.contract_milestones
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contract_milestones_update on public.contract_milestones;
create policy contract_milestones_update on public.contract_milestones
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);
drop policy if exists contract_milestones_delete on public.contract_milestones;
create policy contract_milestones_delete on public.contract_milestones
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING'])
);

-- Receipts
drop policy if exists receipts_select on public.receipts;
create policy receipts_select on public.receipts
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists receipts_insert on public.receipts;
create policy receipts_insert on public.receipts
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists receipts_update on public.receipts;
create policy receipts_update on public.receipts
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists receipts_delete on public.receipts;
create policy receipts_delete on public.receipts
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

-- Invoices
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','PARTNER'])
);
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
for delete using (false);

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','PARTNER'])
);
drop policy if exists invoice_items_insert on public.invoice_items;
create policy invoice_items_insert on public.invoice_items
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists invoice_items_update on public.invoice_items;
create policy invoice_items_update on public.invoice_items
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists invoice_items_delete on public.invoice_items;
create policy invoice_items_delete on public.invoice_items
for delete using (false);

-- Disbursements
drop policy if exists disbursements_select on public.disbursements;
create policy disbursements_select on public.disbursements
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists disbursements_insert on public.disbursements;
create policy disbursements_insert on public.disbursements
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists disbursements_update on public.disbursements;
create policy disbursements_update on public.disbursements
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists disbursements_delete on public.disbursements;
create policy disbursements_delete on public.disbursements
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

-- Suppliers & Customers
drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','WAREHOUSE','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING','WAREHOUSE','PRODUCTION_MANAGER'])
);

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','MARKETING','ACCOUNTING'])
);

-- Inventory
drop policy if exists inventory_stock_select on public.inventory_stock;
create policy inventory_stock_select on public.inventory_stock
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_stock_insert on public.inventory_stock;
create policy inventory_stock_insert on public.inventory_stock
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_stock_update on public.inventory_stock;
create policy inventory_stock_update on public.inventory_stock
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_stock_delete on public.inventory_stock;
create policy inventory_stock_delete on public.inventory_stock
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_movements_insert on public.inventory_movements;
create policy inventory_movements_insert on public.inventory_movements
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_movements_update on public.inventory_movements;
create policy inventory_movements_update on public.inventory_movements
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);
drop policy if exists inventory_movements_delete on public.inventory_movements;
create policy inventory_movements_delete on public.inventory_movements
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','WAREHOUSE','PRODUCTION_MANAGER'])
);

-- Production
drop policy if exists bill_of_materials_select on public.bill_of_materials;
create policy bill_of_materials_select on public.bill_of_materials
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bill_of_materials_insert on public.bill_of_materials;
create policy bill_of_materials_insert on public.bill_of_materials
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bill_of_materials_update on public.bill_of_materials;
create policy bill_of_materials_update on public.bill_of_materials
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bill_of_materials_delete on public.bill_of_materials;
create policy bill_of_materials_delete on public.bill_of_materials
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

drop policy if exists bom_items_select on public.bom_items;
create policy bom_items_select on public.bom_items
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bom_items_insert on public.bom_items;
create policy bom_items_insert on public.bom_items
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bom_items_update on public.bom_items;
create policy bom_items_update on public.bom_items
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists bom_items_delete on public.bom_items;
create policy bom_items_delete on public.bom_items
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

drop policy if exists work_orders_select on public.work_orders;
create policy work_orders_select on public.work_orders
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER','WAREHOUSE'])
);
drop policy if exists work_orders_insert on public.work_orders;
create policy work_orders_insert on public.work_orders
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists work_orders_update on public.work_orders;
create policy work_orders_update on public.work_orders
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists work_orders_delete on public.work_orders;
create policy work_orders_delete on public.work_orders
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

-- HR
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);

drop policy if exists salary_structures_select on public.salary_structures;
create policy salary_structures_select on public.salary_structures
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists salary_structures_insert on public.salary_structures;
create policy salary_structures_insert on public.salary_structures
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists salary_structures_update on public.salary_structures;
create policy salary_structures_update on public.salary_structures
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists salary_structures_delete on public.salary_structures;
create policy salary_structures_delete on public.salary_structures
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);

drop policy if exists leaves_select on public.leaves;
create policy leaves_select on public.leaves
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists leaves_insert on public.leaves;
create policy leaves_insert on public.leaves
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists leaves_update on public.leaves;
create policy leaves_update on public.leaves
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);
drop policy if exists leaves_delete on public.leaves;
create policy leaves_delete on public.leaves
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR'])
);

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select on public.payroll_runs
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payroll_runs_insert on public.payroll_runs;
create policy payroll_runs_insert on public.payroll_runs
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payroll_runs_update on public.payroll_runs;
create policy payroll_runs_update on public.payroll_runs
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payroll_runs_delete on public.payroll_runs;
create policy payroll_runs_delete on public.payroll_runs
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);

drop policy if exists payslips_select on public.payslips;
create policy payslips_select on public.payslips
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payslips_insert on public.payslips;
create policy payslips_insert on public.payslips
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payslips_update on public.payslips;
create policy payslips_update on public.payslips
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);
drop policy if exists payslips_delete on public.payslips;
create policy payslips_delete on public.payslips
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','HR','ACCOUNTING'])
);

-- Accounting
drop policy if exists coa_accounts_select on public.coa_accounts;
create policy coa_accounts_select on public.coa_accounts
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists coa_accounts_insert on public.coa_accounts;
create policy coa_accounts_insert on public.coa_accounts
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists coa_accounts_update on public.coa_accounts;
create policy coa_accounts_update on public.coa_accounts
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists coa_accounts_delete on public.coa_accounts;
create policy coa_accounts_delete on public.coa_accounts
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists journal_entries_select on public.journal_entries;
create policy journal_entries_select on public.journal_entries
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_entries_delete on public.journal_entries;
create policy journal_entries_delete on public.journal_entries
for delete using (false);

drop policy if exists journal_lines_select on public.journal_lines;
create policy journal_lines_select on public.journal_lines
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_lines_insert on public.journal_lines;
create policy journal_lines_insert on public.journal_lines
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_lines_update on public.journal_lines;
create policy journal_lines_update on public.journal_lines
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists journal_lines_delete on public.journal_lines;
create policy journal_lines_delete on public.journal_lines
for delete using (false);

-- Assets
drop policy if exists asset_categories_select on public.asset_categories;
create policy asset_categories_select on public.asset_categories
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_categories_insert on public.asset_categories;
create policy asset_categories_insert on public.asset_categories
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_categories_update on public.asset_categories;
create policy asset_categories_update on public.asset_categories
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_categories_delete on public.asset_categories;
create policy asset_categories_delete on public.asset_categories
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

drop policy if exists asset_depreciation_schedules_select on public.asset_depreciation_schedules;
create policy asset_depreciation_schedules_select on public.asset_depreciation_schedules
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_depreciation_schedules_insert on public.asset_depreciation_schedules;
create policy asset_depreciation_schedules_insert on public.asset_depreciation_schedules
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_depreciation_schedules_update on public.asset_depreciation_schedules;
create policy asset_depreciation_schedules_update on public.asset_depreciation_schedules
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists asset_depreciation_schedules_delete on public.asset_depreciation_schedules;
create policy asset_depreciation_schedules_delete on public.asset_depreciation_schedules
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

-- Settings
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists settings_insert on public.settings;
create policy settings_insert on public.settings
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);
drop policy if exists settings_delete on public.settings;
create policy settings_delete on public.settings
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','ACCOUNTING'])
);

-- Approvals
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals
for insert with check (
  tenant_id = app.current_tenant()
  and (
    public.has_any_role(array['SUPER_ADMIN','CEO'])
    or requester_id = auth.uid()
  )
);
drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists approvals_delete on public.approvals;
create policy approvals_delete on public.approvals
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

-- Projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

drop policy if exists project_stages_select on public.project_stages;
create policy project_stages_select on public.project_stages
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists project_stages_insert on public.project_stages;
create policy project_stages_insert on public.project_stages
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists project_stages_update on public.project_stages;
create policy project_stages_update on public.project_stages
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);
drop policy if exists project_stages_delete on public.project_stages;
create policy project_stages_delete on public.project_stages
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO','PRODUCTION_MANAGER'])
);

-- Audit logs
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

-- Partners & Equity
drop policy if exists partners_select on public.partners;
create policy partners_select on public.partners
for select using (
  tenant_id = app.current_tenant()
  and (
    public.has_any_role(array['SUPER_ADMIN','CEO'])
    or (public.has_any_role(array['PARTNER']) and profile_id = auth.uid())
  )
);
drop policy if exists partners_insert on public.partners;
create policy partners_insert on public.partners
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists partners_update on public.partners;
create policy partners_update on public.partners
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists partners_delete on public.partners;
create policy partners_delete on public.partners
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

drop policy if exists equity_transactions_select on public.equity_transactions;
create policy equity_transactions_select on public.equity_transactions
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists equity_transactions_insert on public.equity_transactions;
create policy equity_transactions_insert on public.equity_transactions
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists equity_transactions_update on public.equity_transactions;
create policy equity_transactions_update on public.equity_transactions
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists equity_transactions_delete on public.equity_transactions;
create policy equity_transactions_delete on public.equity_transactions
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);

drop policy if exists capital_events_select on public.capital_events;
create policy capital_events_select on public.capital_events
for select using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists capital_events_insert on public.capital_events;
create policy capital_events_insert on public.capital_events
for insert with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists capital_events_update on public.capital_events;
create policy capital_events_update on public.capital_events
for update using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
)
with check (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
drop policy if exists capital_events_delete on public.capital_events;
create policy capital_events_delete on public.capital_events
for delete using (
  tenant_id = app.current_tenant()
  and public.has_any_role(array['SUPER_ADMIN','CEO'])
);
