# DB Wiring Audit

## Router Enumeration (authoritative)
Routes are defined in `src/App.tsx`:

- `/login` -> `src/components/Login.tsx`
- `/change-password` -> `src/components/ChangePassword.tsx`
- `/` (layout) -> `src/components/Layout.tsx` with nested routes:
  - `dashboard` -> `src/components/Dashboard.tsx`
  - `approvals` -> `src/components/Approvals.tsx`
  - `compliance` -> `src/components/ComplianceDashboard.tsx`
  - `products` -> `src/components/Products.tsx`
  - `products/new` -> `src/components/products/ProductForm.tsx`
  - `products/:id/edit` -> `src/components/products/ProductForm.tsx`
  - `quotations` -> `src/components/Quotations.tsx`
  - `quotations/new` -> `src/components/quotations/QuotationForm.tsx`
  - `quotations/:id` -> `src/components/quotations/QuotationDetails.tsx`
  - `contracts` -> `src/components/Contracts.tsx`
  - `contracts/new` -> `src/components/contracts/ContractBuilder.tsx`
  - `receipts` -> `src/components/Receipts.tsx`
  - `receipts/new` -> `src/components/receipts/ReceiptForm.tsx`
  - `invoices` -> `src/components/Invoices.tsx`
  - `invoices/new` -> `src/components/invoices/InvoiceForm.tsx`
  - `invoices/:id` -> `src/components/InvoiceDetails.tsx`
  - `disbursements` -> `src/components/Disbursements.tsx`
  - `disbursements/new` -> `src/components/disbursements/DisbursementForm.tsx`
  - `suppliers` -> `src/components/Suppliers.tsx`
  - `suppliers/new` -> `src/components/suppliers/SupplierForm.tsx`
  - `suppliers/:id/edit` -> `src/components/suppliers/SupplierForm.tsx`
  - `customers` -> `src/components/Customers.tsx`
  - `customers/new` -> `src/components/customers/CustomerForm.tsx`
  - `customers/:id/edit` -> `src/components/customers/CustomerForm.tsx`
  - `my-profile` -> `src/components/EmployeeProfile.tsx`
  - `settings` -> `src/components/Settings.tsx`
  - `hr` -> `src/components/HR.tsx`
  - `hr/new` -> `src/components/hr/EmployeeForm.tsx`
  - `hr/:id/edit` -> `src/components/hr/EmployeeForm.tsx`
  - `payroll` -> `src/components/Payroll.tsx`
  - `partners` -> `src/components/Partners.tsx`
  - `production` -> `src/components/Production.tsx`
  - `production/bom` -> `src/components/production/BOMForm.tsx`
  - `production/boms/new` -> `src/components/production/BOMForm.tsx`
  - `production/work-order` -> `src/components/production/WorkOrderForm.tsx`
  - `production/work-orders/new` -> `src/components/production/WorkOrderForm.tsx`
  - `inventory` -> `src/components/Inventory.tsx`
  - `inventory/transaction` -> `src/components/inventory/InventoryTransaction.tsx`
  - `accounting` -> `src/components/Accounting.tsx`
  - `journal` -> `src/components/accounting/JournalEntryForm.tsx`
  - `trial-balance` -> `src/components/accounting/TrialBalance.tsx`
  - `assets` -> `src/components/Assets.tsx`
  - `assets/new` -> `src/components/assets/AssetForm.tsx`

Non-routed components explicitly excluded:
- `src/components/Pending.tsx` (external-only)
- `src/components/AIChatbot.tsx` (external-only)

## Tenant Isolation (verified)
- Tenant ID source: `src/lib/supabase.ts` derives `tenant_id` from JWT claims (`getTenantIdFromSession`), not user-editable metadata.
- RLS/RBAC enforcement: `supabase/migrations/20251221100000_zero_trust_tenant_rbac.sql` applies tenant defaults/NOT NULL and creates tenant-scoped policies for the listed tables. Where explicit `.eq('tenant_id', tenantId)` filters exist, they add defense-in-depth.
- RPC tenant guard: legacy RPCs now verify `p_tenant_id = app.current_tenant_id()` server-side.
- JWT claim injection: `public.custom_access_token_hook` sources tenant_id from server-side tables only and ignores user metadata. Supabase Studio enablement is required (see `docs/AUTH_HOOK_ENABLEMENT.md`).

Claim selection order (server-side)
1) `user_tenants` where `active = true` and `status = 'ACTIVE'` (most recently updated).
2) `user_tenants` where `is_default = true` and `status = 'ACTIVE'`.
3) Any `user_tenants` row with `status = 'ACTIVE'` (oldest).
4) `user_tenant_sessions` by `last_selected_at` (fallback when no memberships are active).

## Wiring Matrix

| Page/Form | Entry Points (UI -> Service) | DB Tables / RPC | Tenant Guard | Risks | Status |
|---|---|---|---|---|---|
| Login | `Login.handleLogin` -> `dataService.signInWithPassword` | Supabase Auth | Auth server-side | None | OK |
| Signup | `Signup.handleSubmit` -> `dataService.signUpAndRequestAccess` | Auth + `approvals`, `profiles` | RLS + auth trigger | None | OK |
| ChangePassword | `ChangePassword.handleUpdate` -> `dataService.updateUserPassword` | Supabase Auth | Auth server-side | None | OK |
| Dashboard | `Dashboard.useEffect` -> `dataService.getDashboardData` | `receipts`, `disbursements`, `invoices`, `approvals`, `contracts` | Explicit tenant_id filter | None | OK |
| ComplianceDashboard | `ComplianceDashboard.loadData` -> `complianceService` | `invoices`, `audit_logs`, `journal_entries`, `journal_lines`, `coa_accounts` | Explicit tenant_id filter (service) | None | OK |
| Approvals | `Approvals` -> `dataService.getApprovalRequests` + access actions | `approvals`, `profiles`, `roles`, `user_roles` (+ RPC `create_approval_request` / `approval_decision`) | Explicit tenant_id filter + RPC tenant guard | None | OK |
| Contracts | `Contracts.loadData` -> `dataService.getContracts` + actions | `contracts`, `contract_items`, `contract_milestones`, `approvals`, `receipts`, `customers`, `disbursements` | Explicit tenant_id filter and RPCs | None | OK |
| ContractBuilder | `ContractBuilder.save` -> `dataService.addContract` | RPC `create_contract` | RLS + tenant_id in RPC | None | OK |
| Projects | `Projects.loadData` -> `dataService.getProjects` | `projects`, `project_stages`, `disbursements` | Explicit tenant_id filter | None | OK |
| Inventory | `Inventory.useEffect` -> `erpService.getInventoryStock` | `inventory_stock`, `warehouses`, `products` | Explicit tenant_id filter | None | OK |
| InventoryTransaction | `InventoryTransaction` -> `erpService.adjustStockByProduct` | RPC `adjust_inventory_with_movement` -> `inventory_stock`, `inventory_movements` | Explicit tenant_id in RPC + tenant guard | None | OK |
| Production | `Production.loadData` -> `dataService.getProjects`, `erpService.getWorkOrders/BOMs`, `erpService.completeWorkOrder` | RPC `complete_work_order` -> `work_orders`, `inventory_stock`, `inventory_movements`, `journal_entries`, `journal_lines`, `audit_logs` | Server-side RLS/RBAC + claim guard | None | OK |
| BOMForm | `BOMForm.handleSubmit` -> `erpService.createBOM` | RPC `create_bom_with_items` -> `bill_of_materials`, `bom_items` | Explicit tenant_id in RPC | None | OK |
| WorkOrderForm | `WorkOrderForm.handleSubmit` -> `erpService.createWorkOrder` | `work_orders` | Explicit tenant_id | None | OK |
| Accounting | `Accounting.loadSnapshot` -> `journalService.getAccountingSnapshot` | `journal_entries`, `journal_lines`, `disbursements`, `invoices` | RLS + explicit tenant_id in services | None | OK |
| JournalEntryForm | `JournalEntryForm.handleSubmit` -> `dataService.createJournalEntry` | RPC `create_journal_entry_secure` | Server-side RLS/RBAC | None | OK |
| TrialBalance | `TrialBalance.useEffect` -> `accountingService.getTrialBalance` | `coa_accounts`, `journal_lines`, `journal_entries` | RLS + explicit tenant_id | None | OK |
| HR | `HR.loadData` -> `dataService.getEmployees` + approval requests | `employees`, `leaves`, `approvals` | Explicit tenant_id filter | None | OK |
| EmployeeForm | `EmployeeForm` -> `dataService.add/updateEmployee` | RPC `create_employee` + `employees`, `salary_structures`, `leaves`, `audit_logs` | Explicit tenant_id filter | None | OK |
| Payroll | `Payroll` -> `erpService.createPayrollRun` | RPC `create_payroll_run_with_payslips` -> `payroll_runs`, `payslips` | Explicit tenant_id in RPC | None | OK |
| EmployeeProfile | `EmployeeProfile` -> `dataService.getMyProfile/updateMyProfile` | `employees`, `leaves`, `approvals`, storage `employee-files` | Explicit tenant_id filter | None | OK |
| Suppliers | `Suppliers` -> `dataService.getSuppliers` | `suppliers` | Explicit tenant_id filter | None | OK |
| SupplierForm | `SupplierForm` -> `dataService.add/updateSupplier` | `suppliers` | Explicit tenant_id filter | None | OK |
| Customers | `Customers` -> `dataService.getCustomers` | `customers` | Explicit tenant_id filter | None | OK |
| CustomerForm | `CustomerForm` -> `dataService.add/updateCustomer` | `customers` | Explicit tenant_id filter | None | OK |
| Products | `Products` -> `dataService.getProducts` | `products`, `product_sizes` | Explicit tenant_id filter | None | OK |
| ProductForm | `ProductForm.handleSave` -> `dataService.add/updateProduct` | RPC `create_product`, `update_product_with_sizes` -> `products`, `product_sizes` | Explicit tenant_id in RPC + tenant guard | None | OK |
| Disbursements | `Disbursements` -> `dataService.getDisbursements` | `disbursements` | Explicit tenant_id filter | None | OK |
| DisbursementForm | `DisbursementForm.handleSave` -> `dataService.addDisbursement` | `disbursements` | Explicit tenant_id filter | None | OK |
| Receipts | `Receipts.loadData` -> `dataService.getReceipts` | `receipts` | Explicit tenant_id filter | None | OK |
| ReceiptForm | `ReceiptForm.handleSave` -> `dataService.addReceipt` | `receipts` | Explicit tenant_id filter | None | OK |
| Quotations | `Quotations.loadData` -> `dataService.getQuotations` | `quotations`, `quotation_items` | Explicit tenant_id filter | None | OK |
| QuotationForm | `QuotationForm.handleSave` -> `dataService.addQuotation` | RPC `create_quotation` -> `quotations`, `quotation_items` | Explicit tenant_id in RPC | None | OK |
| QuotationDetails | `QuotationDetails.convert` -> `dataService.convertQuotationToContract` | `quotations`, `contracts`, `contract_items`, `contract_milestones` | RPC + tenant_id | None | OK |
| Invoices | `Invoices` -> `invoiceService.list` | `invoices`, `invoice_items`, `posting_meta` | RLS tenant policies | None | OK |
| InvoiceDetails | `InvoiceDetails` -> `invoiceService.getById/approve/post` | RPC `set_invoice_status_secure`, `post_invoice_secure` | Server-side RLS/RBAC | None | OK |
| InvoiceForm | `InvoiceForm` -> `invoiceService.create` | RPC `create_invoice_secure` | Server-side RLS/RBAC | None | OK |
| Settings | `Settings.load/save` -> `dataService.get/updateCompanySettings` | `settings` | Explicit tenant_id filter | None | OK |
| Assets | `Assets.load` -> `erpService.getAssets/getAssetCategories` | `assets`, `asset_categories` | RLS tenant policies | None | OK |
| AssetForm | `AssetForm.handleSave` -> `erpService.createAsset` | `assets` | Explicit tenant_id filter | None | OK |
| Pending | External-only | None | None | N/A | N/A |
| AIChatbot | External-only | None | None | N/A | N/A |

## Known Risks and Mitigations
- Supabase Cloud requires enabling the Custom Access Token Hook in Studio. Without it, JWTs will not include `tenant_id` and `verify:wiring` will fail. Runbook: `docs/AUTH_HOOK_ENABLEMENT.md`.




