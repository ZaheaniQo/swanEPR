
import { InventoryItem, Employee, Contract, Project, Supplier, Customer, Role } from './types';

// Use this schema in Supabase SQL Editor to set up the database
export const SQL_SCHEMA = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (For Role Management)
create table public.profiles (
  id uuid references auth.users not null primary key,
  role text check (role in ('CEO', 'MARKETING', 'WAREHOUSE', 'ACCOUNTING', 'HR', 'PRODUCTION_MANAGER', 'PARTNER')),
  full_name text,
  avatar_url text
);

-- SETTINGS
create table public.settings (
  id uuid default uuid_generate_v4() primary key,
  legalName text,
  vatNumber text,
  crNumber text,
  address text,
  country text,
  logoUrl text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- EMPLOYEES
create table public.employees (
  id uuid default uuid_generate_v4() primary key,
  name text,
  role text,
  department text,
  status text,
  joinDate date,
  basicSalary numeric,
  housingAllowance numeric,
  transportAllowance numeric,
  otherAllowances numeric,
  annualLeaveBalance numeric,
  nationality text,
  nationalId text,
  phone text,
  email text,
  iban text,
  contractType text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CUSTOMERS
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  name text,
  company text,
  email text,
  phone text,
  address text,
  vatNumber text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- SUPPLIERS
create table public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text,
  company text,
  email text,
  phone text,
  address text,
  crNumber text,
  type text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CONTRACTS
create table public.contracts (
  id uuid default uuid_generate_v4() primary key,
  contractNumber text,
  clientId text,
  clientName text,
  title text,
  totalValue numeric,
  status text,
  startDate date,
  deliveryDate date,
  payment1Status text,
  payment2Status text,
  currency text,
  clientSignature text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone
);

create table public.contract_items (
  id uuid default uuid_generate_v4() primary key,
  contractId uuid references public.contracts(id),
  productName text,
  quantity numeric,
  unitPrice numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.contract_milestones (
  id uuid default uuid_generate_v4() primary key,
  contractId uuid references public.contracts(id),
  name text,
  amountType text,
  value numeric,
  amount numeric,
  dueDate date,
  trigger text,
  status text,
  paidAt timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- PROJECTS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  contractId uuid,
  contractNumber text,
  name text,
  status text,
  progress numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.project_stages (
  id uuid default uuid_generate_v4() primary key,
  projectId uuid references public.projects(id),
  name text,
  status text,
  startDate date,
  endDate date,
  "order" integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- INVENTORY
create table public.inventory_items (
  id uuid default uuid_generate_v4() primary key,
  code text,
  name text,
  type text,
  quantity numeric,
  unit text,
  reorderLevel numeric,
  cost numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  itemId uuid references public.inventory_items(id),
  type text,
  quantity numeric,
  referenceType text,
  referenceId text,
  date timestamp with time zone,
  userId uuid,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- FINANCE
create table public.coa_accounts (
  id uuid default uuid_generate_v4() primary key,
  code text,
  name text,
  type text,
  description text,
  isSystem boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  entryNumber text,
  date date,
  description text,
  reference text,
  status text,
  totalDebit numeric,
  totalCredit numeric,
  createdBy text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.journal_lines (
  id uuid default uuid_generate_v4() primary key,
  journalId uuid references public.journal_entries(id),
  accountId uuid references public.coa_accounts(id),
  accountName text,
  description text,
  debit numeric,
  credit numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  invoiceNumber text,
  type text,
  issueDate timestamp with time zone,
  subtotal numeric,
  vatAmount numeric,
  totalAmount numeric,
  currency text,
  status text,
  seller jsonb,
  buyer jsonb,
  zatca jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoiceId uuid references public.invoices(id),
  description text,
  quantity numeric,
  unitPrice numeric,
  netAmount numeric,
  vatRate numeric,
  vatAmount numeric,
  totalAmount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.disbursements (
  id uuid default uuid_generate_v4() primary key,
  date date,
  category text,
  amount numeric,
  paymentMethod text,
  description text,
  approvalStatus text,
  supplierId uuid,
  contractId uuid,
  projectId uuid,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.receipts (
  id uuid default uuid_generate_v4() primary key,
  receiptNumber text,
  contractId uuid,
  contractTitle text,
  milestoneId uuid,
  customerName text,
  amount numeric,
  date date,
  paymentMethod text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.approvals (
  id uuid default uuid_generate_v4() primary key,
  type text,
  title text,
  description text,
  requesterName text,
  date date,
  status text,
  relatedEntityId uuid,
  amount numeric,
  priority text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- SALES
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text,
  description text,
  category text,
  qualityLevel text,
  skuPrefix text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.product_sizes (
  id uuid default uuid_generate_v4() primary key,
  productId uuid references public.products(id) on delete cascade,
  size text,
  cost numeric,
  price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.quotations (
  id uuid default uuid_generate_v4() primary key,
  quotationNumber text,
  customerName text,
  customerCompany text,
  customerPhone text,
  customerEmail text,
  date date,
  expiryDate date,
  subtotal numeric,
  vatAmount numeric,
  totalAmount numeric,
  status text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.quotation_items (
  id uuid default uuid_generate_v4() primary key,
  quotationId uuid references public.quotations(id),
  description text,
  quantity numeric,
  unitPrice numeric,
  total numeric,
  productId uuid,
  sizeId uuid,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ENABLE RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.contracts enable row level security;
-- Add policies as needed, e.g., allow read for authenticated users:
create policy "Public read for authenticated users" on public.contracts for select to authenticated using (true);
`;

export const TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  'app.name': { en: 'Black Swan ERP', ar: 'نظام بلاك سوان' },
  'welcome': { en: 'Welcome', ar: 'مرحباً' },
  'search.placeholder': { en: 'Search...', ar: 'بحث...' },
  'status': { en: 'Status', ar: 'الحالة' },
  'auth.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'auth.password': { en: 'Password', ar: 'كلمة المرور' },
  'auth.signIn': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'auth.signingIn': { en: 'Signing in...', ar: 'جاري تسجيل الدخول...' },
  'auth.loggedIn': { en: 'Logged in successfully', ar: 'تم تسجيل الدخول بنجاح' },
  'auth.failed': { en: 'Login failed', ar: 'فشل تسجيل الدخول' },
  'auth.note': { en: 'Use your Supabase credentials. Roles are pulled from profiles.', ar: 'استخدم بيانات Supabase. يتم جلب الصلاحيات من جدول profiles.' },
  
  // Menu Items
  'menu.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'menu.approvals': { en: 'Approvals', ar: 'الموافقات' },
  'menu.compliance': { en: 'Compliance', ar: 'الامتثال' },
  'menu.products': { en: 'Products', ar: 'المنتجات' },
  'menu.quotations': { en: 'Quotations', ar: 'عروض الأسعار' },
  'menu.contracts': { en: 'Contracts', ar: 'العقود' },
  'menu.receipts': { en: 'Receipts', ar: 'سندات القبض' },
  'menu.invoices': { en: 'Invoices', ar: 'الفواتير' },
  'menu.disbursements': { en: 'Disbursements', ar: 'المصروفات' },
  'menu.production': { en: 'Production', ar: 'الإنتاج' },
  'menu.inventory': { en: 'Inventory', ar: 'المخزون' },
  'menu.suppliers': { en: 'Suppliers', ar: 'الموردين' },
  'menu.customers': { en: 'Customers', ar: 'العملاء' },
  'menu.accounting': { en: 'Accounting', ar: 'المحاسبة' },
  'menu.assets': { en: 'Assets', ar: 'الأصول' },
  'menu.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'menu.payroll': { en: 'Payroll', ar: 'الرواتب' },
  'menu.partners': { en: 'Partners', ar: 'الشركاء' },
  'menu.settings': { en: 'Settings', ar: 'الإعدادات' },

  // Receipts
  'receipts.title': { en: 'Receipts', ar: 'سندات القبض' },
  'receipts.subtitle': { en: 'Incoming payments and receipts', ar: 'المدفوعات الواردة وسندات القبض' },

  // Roles
  'role.super_admin': { en: 'Super Admin', ar: 'مدير النظام' },
  'role.ceo': { en: 'CEO', ar: 'المدير التنفيذي' },
  'role.marketing': { en: 'Marketing', ar: 'التسويق' },
  'role.warehouse': { en: 'Warehouse', ar: 'المستودع' },
  'role.accounting': { en: 'Accounting', ar: 'المحاسبة' },
  'role.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'role.production_manager': { en: 'Production Manager', ar: 'مدير الإنتاج' },
  'role.partner': { en: 'Partner', ar: 'شريك' },

  // Buttons & Actions
  'btn.create': { en: 'Create New', ar: 'إنشاء جديد' },
  'btn.add': { en: 'Add', ar: 'إضافة' },
  'btn.save': { en: 'Save', ar: 'حفظ' },
  'btn.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'btn.delete': { en: 'Delete', ar: 'حذف' },
  'btn.edit': { en: 'Edit', ar: 'تعديل' },
  'btn.view': { en: 'View', ar: 'عرض' },
  'btn.approve': { en: 'Approve', ar: 'اعتماد' },
  'btn.reject': { en: 'Reject', ar: 'رفض' },
  'btn.print': { en: 'Print', ar: 'طباعة' },
  'btn.export': { en: 'Export', ar: 'تصدير' },
  'btn.refresh': { en: 'Refresh', ar: 'تحديث' },
  'btn.reset': { en: 'Reset', ar: 'إعادة الضبط' },

  // Messages
  'msg.saved': { en: 'Saved Successfully', ar: 'تم الحفظ بنجاح' },
  'msg.deleted': { en: 'Deleted Successfully', ar: 'تم الحذف بنجاح' },
  'msg.fillRequired': { en: 'Please fill required fields', ar: 'يرجى تعبئة الحقول المطلوبة' },
  'msg.errorLoading': { en: 'Error loading data', ar: 'خطأ في تحميل البيانات' },
  'msg.error': { en: 'An error occurred', ar: 'حدث خطأ' },
  'msg.approved': { en: 'Approved successfully', ar: 'تم الاعتماد بنجاح' },
  'msg.rejected': { en: 'Rejected successfully', ar: 'تم الرفض' },
  'msg.actionFailed': { en: 'Action failed', ar: 'فشل الإجراء' },
  'msg.confirmDelete': { en: 'Are you sure you want to delete this?', ar: 'هل أنت متأكد من الحذف؟' },
  'msg.stockSuccess': { en: 'Order processed successfully', ar: 'تم تنفيذ الطلب بنجاح' },
  'msg.permissionDenied': { en: 'Permission Denied', ar: 'الصلاحيات غير كافية' },
  'msg.confirmComplete': { en: 'Are you sure you want to complete this work order? This will consume raw materials and post accounting entries.', ar: 'هل أنت متأكد من إكمال أمر العمل؟ سيؤدي ذلك إلى استهلاك المواد الخام وترحيل القيود المحاسبية.' },
  'msg.notImplemented': { en: 'Coming soon', ar: 'قريباً' },
  'noData': { en: 'No data available', ar: 'لا توجد بيانات' },

  // Ecommerce
  'ecommerce.heroTitle': { en: 'Premium Medical Wear', ar: 'ملابس طبية فاخرة' },
  'ecommerce.heroText': { en: 'High quality uniforms for professionals.', ar: 'زي طبي عالي الجودة للمتخصصين.' },
  'ecommerce.cart': { en: 'Shopping Cart', ar: 'سلة المشتريات' },
  'ecommerce.emptyCart': { en: 'Cart is empty', ar: 'السلة فارغة' },
  'ecommerce.total': { en: 'Total', ar: 'الإجمالي' },
  'ecommerce.checkoutB2C': { en: 'Consumer Checkout', ar: 'إتمام شراء للأفراد' },
  'ecommerce.checkoutB2B': { en: 'Business Checkout', ar: 'إتمام شراء للشركات' },

  // Approvals
  'approvals.title': { en: 'Approvals', ar: 'الموافقات' },
  'approvals.subtitle': { en: 'Review and process pending requests', ar: 'مراجعة ومعالجة الطلبات المعلقة' },
  'approvals.pending': { en: 'Pending', ar: 'معلّق' },
  'approvals.approved': { en: 'Approved', ar: 'معتمد' },
  'approvals.rejected': { en: 'Rejected', ar: 'مرفوض' },
  'approvals.helperApprover': { en: 'You can approve or reject pending requests.', ar: 'يمكنك اعتماد أو رفض الطلبات المعلقة.' },
  'approvals.helperViewer': { en: 'You can view requests but approvals are restricted to approvers.', ar: 'يمكنك عرض الطلبات فقط، أما الاعتماد فمقتصر على المخولين.' },
  'approvals.filterType': { en: 'Type', ar: 'النوع' },
  'approvals.allTypes': { en: 'All types', ar: 'كل الأنواع' },
  'approvals.typeInvoice': { en: 'Invoice', ar: 'فاتورة' },
  'approvals.typePayment': { en: 'Payment', ar: 'دفعة' },
  'approvals.typeExpense': { en: 'Expense', ar: 'مصروف' },
  'approvals.typeContract': { en: 'Contract', ar: 'عقد' },
  'approvals.typeHiring': { en: 'Hiring', ar: 'توظيف' },
  'approvals.filterPriority': { en: 'Priority', ar: 'الأولوية' },
  'approvals.allPriorities': { en: 'All priorities', ar: 'كل الأولويات' },
  'approvals.priorityHigh': { en: 'High Priority', ar: 'أولوية عالية' },
  'approvals.priorityMedium': { en: 'Medium Priority', ar: 'أولوية متوسطة' },
  'approvals.priorityLow': { en: 'Low Priority', ar: 'أولوية منخفضة' },
  'approvals.tabPending': { en: 'Pending', ar: 'معلّق' },
  'approvals.tabHistory': { en: 'History', ar: 'السجل' },
  'approvals.emptyTitle': { en: 'No requests found', ar: 'لا توجد طلبات' },
  'approvals.emptySubtitle': { en: "You're all caught up!", ar: 'لا توجد مهام حالياً' },
  'approvals.amount': { en: 'Amount', ar: 'المبلغ' },
  'approvals.processed': { en: 'Processed', ar: 'مُعالَج' },
  'approvals.viewDetails': { en: 'View Details', ar: 'عرض التفاصيل' },
  'approvals.status.pending': { en: 'Pending', ar: 'معلّق' },
  'approvals.status.approved': { en: 'Approved', ar: 'معتمد' },
  'approvals.status.rejected': { en: 'Rejected', ar: 'مرفوض' },

  // Production
  'production.title': { en: 'Production', ar: 'الإنتاج' },
  'production.subtitle': { en: 'Projects, work orders, and BOMs', ar: 'المشاريع وأوامر العمل وقوائم المواد' },
  'production.projectCost': { en: 'Project Cost', ar: 'تكلفة المشروع' },
  'production.progress': { en: 'Progress', ar: 'نسبة الإنجاز' },
  'production.projectExpenses': { en: 'Project Expenses', ar: 'مصروفات المشروع' },
  'production.noProjects': { en: 'No projects found', ar: 'لا توجد مشاريع' },
  'production.tabs.projects': { en: 'Projects', ar: 'المشاريع' },
  'production.tabs.workOrders': { en: 'Work Orders', ar: 'أوامر العمل' },
  'production.tabs.boms': { en: 'BOMs', ar: 'قوائم المواد' },

  // Production KPIs & filters
  'production.kpi.activeProjects': { en: 'Active Projects', ar: 'المشاريع النشطة' },
  'production.kpi.avgProgress': { en: 'Avg Progress', ar: 'متوسط الإنجاز' },
  'production.kpi.costToDate': { en: 'Cost to date', ar: 'التكلفة حتى الآن' },
  'production.kpi.linkedContracts': { en: 'Linked to contracts', ar: 'مرتبطة بالعقود' },
  'production.kpi.filtered': { en: 'Filtered set', ar: 'حسب الفلتر' },
  'production.kpi.disbursements': { en: 'From disbursements', ar: 'من المصروفات' },
  'production.filters.search': { en: 'Search project or contract...', ar: 'ابحث عن مشروع أو عقد...' },
  'production.filters.minProgress': { en: 'Min progress', ar: 'أدنى نسبة إنجاز' },
  'production.emptyHint': { en: 'Try relaxing filters or ensure contracts are moved to the production stage.', ar: 'جرّب تخفيف الفلاتر أو تأكد من نقل العقود إلى مرحلة الإنتاج.' },

  // Work Orders actions
  'production.wo.complete': { en: 'Complete', ar: 'إكمال' },
  'production.wo.issue': { en: 'Issue', ar: 'صرف' },
  'production.wo.receive': { en: 'Receive', ar: 'استلام' },
  'production.wo.partial': { en: 'Partial', ar: 'إنجاز جزئي' },
  'production.wo.issueToast': { en: 'Issue materials for WO', ar: 'صرف مواد لأمر العمل' },
  'production.wo.receiveToast': { en: 'Receive materials for WO', ar: 'استلام مواد لأمر العمل' },
  'production.wo.partialToast': { en: 'Record partial completion for WO', ar: 'تسجيل إنجاز جزئي لأمر العمل' },
  'production.wo.new': { en: '+ New Work Order', ar: 'أمر عمل جديد' },
  'production.wo.create': { en: 'Create Work Order', ar: 'إنشاء أمر عمل' },
  'production.wo.empty': { en: 'No work orders found', ar: 'لا توجد أوامر عمل' },
  'production.wo.status.completed': { en: 'Completed', ar: 'مكتمل' },
  'production.wo.status.inProgress': { en: 'In Progress', ar: 'قيد التنفيذ' },
  'production.wo.status.cancelled': { en: 'Cancelled', ar: 'ملغى' },
  'production.wo.due': { en: 'Due', ar: 'تاريخ الاستحقاق' },
  'production.wo.qty': { en: 'Qty', ar: 'الكمية' },
  'production.wo.produced': { en: 'Produced', ar: 'المنتج' },
  'production.bom.label': { en: 'BOM', ar: 'قائمة مواد' },

  // BOM actions
  'production.bom.useInWO': { en: 'Use in WO', ar: 'استخدام في أمر عمل' },
  'production.bom.activate': { en: 'Activate', ar: 'تفعيل' },
  'production.bom.deactivate': { en: 'Deactivate', ar: 'إلغاء التفعيل' },
  'production.bom.create': { en: 'Create BOM', ar: 'إنشاء قائمة مواد' },
  'production.bom.components': { en: 'Components', ar: 'المكوّنات' },
  'production.bom.outputQty': { en: 'Output Qty', ar: 'كمية المخرج' },
  'production.bom.version': { en: 'Version', ar: 'الإصدار' },
  'production.bom.empty': { en: 'No Bill of Materials found', ar: 'لا توجد قوائم مواد' },
  'production.bom.new': { en: '+ New BOM', ar: 'قائمة مواد جديدة' },

  // Customers
  'customers.title': { en: 'Customers', ar: 'العملاء' },
  'customers.subtitle': { en: 'Manage client profiles and history', ar: 'إدارة بيانات العملاء وسجلهم' },
  'customers.search': { en: 'Search customers...', ar: 'ابحث عن العملاء...' },
  'customers.table.customerCompany': { en: 'Customer / Company', ar: 'العميل / الشركة' },
  'customers.table.contact': { en: 'Contact Info', ar: 'بيانات التواصل' },
  'customers.table.location': { en: 'Location', ar: 'الموقع' },
  'customers.table.vat': { en: 'VAT No.', ar: 'الرقم الضريبي' },
  'customers.table.actions': { en: 'Actions', ar: 'إجراءات' },
  'customers.empty': { en: 'No customers found.', ar: 'لا يوجد عملاء.' },

  // Disbursements
  'disbursements.title': { en: 'Disbursements', ar: 'المصروفات' },
  'disbursements.subtitle': { en: 'Track outgoing payments and allocations', ar: 'تتبع المدفوعات الخارجة والتخصيصات' },
  'disbursements.empty': { en: 'No disbursements recorded', ar: 'لا توجد مصروفات مسجلة' },
  'btn.newExpense': { en: 'New Expense', ar: 'مصروف جديد' },

  // Inventory
  'inventory.title': { en: 'Inventory', ar: 'المخزون' },
  'inventory.subtitle': { en: 'Stock visibility and movements', ar: 'رؤية المخزون والحركات' },
  'inventory.lowStock': { en: 'Low stock', ar: 'مخزون منخفض' },
  'inventory.inStock': { en: 'In stock', ar: 'متوفر' },
  'inventory.onHand': { en: 'On hand', ar: 'المتوفر' },
  'inventory.unitValuation': { en: 'Unit valuation', ar: 'تكلفة الوحدة' },
  'btn.recordMovement': { en: 'Record Movement', ar: 'تسجيل حركة' },
  'search.inventory': { en: 'Search inventory...', ar: 'ابحث في المخزون...' },
  'filter.all': { en: 'All', ar: 'الكل' },
  'filter.material': { en: 'Material', ar: 'مواد خام' },
  'filter.product': { en: 'Product', ar: 'منتج' },

  // Columns & labels
  'col.category': { en: 'Category', ar: 'التصنيف' },
  'col.relatedTo': { en: 'Related to', ar: 'مرتبط بـ' },
  'col.code': { en: 'Code', ar: 'الرمز' },
  'lbl.description': { en: 'Description', ar: 'الوصف' },
  
  // Common
  'currency': { en: 'SAR', ar: 'ريال' },
  'loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'common.unknown': { en: 'Unknown', ar: 'غير معروف' },
  'common.na': { en: 'N/A', ar: 'غير متوفر' },

  // Dashboard
  'dashboard.overview': { en: 'Overview', ar: 'نظرة عامة' },
  'dashboard.updated': { en: 'Updated', ar: 'آخر تحديث' },
  'dashboard.today': { en: 'Today', ar: 'اليوم' },
  'kpi.netProfit': { en: 'Net Profit', ar: 'صافي الربح' },
  'kpi.expenses': { en: 'Expenses', ar: 'المصروفات' },
  'kpi.contracts': { en: 'Contracts', ar: 'العقود' },
  'kpi.pendingApprovals': { en: 'Pending Approvals', ar: 'موافقات معلقة' },
  'kpi.sub.revenueMinusExpenses': { en: 'Revenue - Expenses', ar: 'الإيرادات - المصروفات' },
  'kpi.sub.allApproved': { en: 'All approved costs', ar: 'كل التكاليف المعتمدة' },
  'kpi.sub.needsAction': { en: 'Needs action', ar: 'بحاجة لاتخاذ إجراء' },
  'kpi.breakeven': { en: 'Break-even', ar: 'نقطة التعادل' },
  'status.active': { en: 'Active', ar: 'نشط' },
  'status.inactive': { en: 'Inactive', ar: 'غير نشط' },
  'chart.financialPerformance': { en: 'Financial Performance', ar: 'الأداء المالي' },
  'chart.revenue': { en: 'Revenue', ar: 'الإيرادات' },
  'chart.expenses': { en: 'Expenses', ar: 'المصروفات' },
  'chart.breakEvenAnalysis': { en: 'Break-even Analysis', ar: 'تحليل نقطة التعادل' },
  'chart.target': { en: 'Target', ar: 'الهدف' },
  'chart.actualSales': { en: 'Actual Sales', ar: 'المبيعات الفعلية' },

  // Compliance
  'compliance.title': { en: 'Compliance Control Tower', ar: 'مركز مراقبة الامتثال' },
  'compliance.subtitle': { en: 'VAT, ZATCA, and audit readiness in one view.', ar: 'جاهزية الضريبة، الزكاة والتدقيق في شاشة واحدة.' },
  'compliance.vatSummary': { en: 'VAT Summary', ar: 'ملخص ضريبة القيمة المضافة' },
  'compliance.netPayable': { en: 'Net VAT Payable', ar: 'صافي الضريبة المستحقة' },
  'compliance.netDue': { en: 'Net Due', ar: 'الصافي المستحق' },
  'compliance.outputVat': { en: 'Output VAT', ar: 'ضريبة المخرجات' },
  'compliance.inputVat': { en: 'Input VAT', ar: 'ضريبة المدخلات' },
  'compliance.totalSales': { en: 'Taxable Sales', ar: 'المبيعات الخاضعة' },
  'compliance.zakatEstimator': { en: 'Zakat Estimator', ar: 'حساب الزكاة' },
  'compliance.estZakatBase': { en: 'Estimated Zakat Base', ar: 'الوعاء التقديري للزكاة' },
  'compliance.zakatRate': { en: 'Zakat Rate', ar: 'نسبة الزكاة' },
  'compliance.approxPayable': { en: 'Approx. Payable', ar: 'المبلغ المستحق تقريبا' },
  'compliance.downloadPack': { en: 'Download Pack', ar: 'تحميل الحزمة' },
  'compliance.alerts': { en: 'Compliance Alerts', ar: 'تنبيهات الامتثال' },
  'compliance.auditTrail': { en: 'Audit Trail', ar: 'سجل التدقيق' },
  'compliance.complianceScore': { en: 'Compliance Score', ar: 'درجة الامتثال' },
  'compliance.openIssues': { en: 'Open Issues', ar: 'ملاحظات مفتوحة' },
  'compliance.period': { en: 'Period', ar: 'الفترة' },
  'compliance.refresh': { en: 'Refresh', ar: 'تحديث' },

  // HR
  'hr.title': { en: 'Human Resources', ar: 'الموارد البشرية' },
  'hr.subtitle': { en: 'People and payroll overview', ar: 'نظرة عامة على الموظفين والرواتب' },
  'hr.addEmployee': { en: 'Add Employee', ar: 'إضافة موظف' },
  'hr.totalPayroll': { en: 'Total Payroll', ar: 'إجمالي الرواتب' },
  'hr.activeStaff': { en: 'Active Staff', ar: 'الموظفون النشطون' },
  'hr.onLeave': { en: 'On Leave', ar: 'في إجازة' },
  'hr.department': { en: 'Department', ar: 'القسم' },
  'hr.joined': { en: 'Joined', ar: 'تاريخ الانضمام' },

  // Invoices / Tables
  'invoices.title': { en: 'Invoices', ar: 'الفواتير' },
  'invoices.subtitle': { en: 'Manage sales invoices', ar: 'إدارة فواتير المبيعات' },
  'invoices.status.draft': { en: 'Draft', ar: 'مسودة' },
  'invoices.status.approved': { en: 'Approved', ar: 'معتمدة' },
  'invoices.status.posted': { en: 'Posted', ar: 'مُرحّلة' },
  'invoices.status.reported': { en: 'Reported', ar: 'مُبلّغ عنها' },
  'btn.next': { en: 'Load more', ar: 'تحميل المزيد' },
  'col.invoiceNo': { en: 'Invoice No.', ar: 'رقم الفاتورة' },
  'col.date': { en: 'Date', ar: 'التاريخ' },
  'col.customer': { en: 'Customer', ar: 'العميل' },
  'col.contractNo': { en: 'Contract No.', ar: 'رقم العقد' },
  'col.method': { en: 'Method', ar: 'طريقة الدفع' },
  'col.total': { en: 'Total', ar: 'الإجمالي' },
  'col.amount': { en: 'Amount', ar: 'المبلغ' },
  'col.status': { en: 'Status', ar: 'الحالة' },
  'col.actionsColumn': { en: 'Actions', ar: 'إجراءات' },
};

// Central permissions map shared by navigation and route guards
export const FEATURE_ROLES: Record<string, Role[]> = {
  dashboard: [Role.CEO, Role.PARTNER, Role.ACCOUNTING, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER, Role.HR],
  approvals: [Role.CEO],
  compliance: [Role.CEO, Role.ACCOUNTING, Role.PARTNER],
  products_view: [Role.CEO, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER],
  products_write: [Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE],
  quotations_view: [Role.CEO, Role.MARKETING, Role.ACCOUNTING],
  quotations_write: [Role.CEO, Role.MARKETING, Role.ACCOUNTING],
  contracts_view: [Role.CEO, Role.MARKETING, Role.ACCOUNTING, Role.PRODUCTION_MANAGER],
  contracts_write: [Role.CEO, Role.MARKETING],
  receipts_view: [Role.CEO, Role.ACCOUNTING],
  receipts_write: [Role.CEO, Role.ACCOUNTING],
  invoices_view: [Role.CEO, Role.ACCOUNTING, Role.PARTNER],
  invoices_write: [Role.CEO, Role.ACCOUNTING],
  disbursements_view: [Role.CEO, Role.ACCOUNTING],
  disbursements_write: [Role.CEO, Role.ACCOUNTING],
  suppliers_view: [Role.CEO, Role.ACCOUNTING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER],
  suppliers_write: [Role.CEO, Role.ACCOUNTING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER],
  customers_view: [Role.CEO, Role.MARKETING, Role.ACCOUNTING],
  customers_write: [Role.CEO, Role.MARKETING, Role.ACCOUNTING],
  inventory_view: [Role.CEO, Role.WAREHOUSE, Role.PRODUCTION_MANAGER],
  inventory_write: [Role.CEO, Role.WAREHOUSE, Role.PRODUCTION_MANAGER],
  production_view: [Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE],
  production_write: [Role.CEO, Role.PRODUCTION_MANAGER],
  accounting_view: [Role.CEO, Role.ACCOUNTING, Role.PARTNER],
  accounting_write: [Role.CEO, Role.ACCOUNTING],
  assets: [Role.CEO, Role.ACCOUNTING],
  hr: [Role.CEO, Role.HR],
  payroll: [Role.CEO, Role.HR, Role.ACCOUNTING],
  partners: [Role.CEO, Role.PARTNER],
  settings: [Role.CEO, Role.ACCOUNTING]
};

export const MOCK_INVENTORY: InventoryItem[] = [];
export const MOCK_CONTRACTS: Contract[] = [];
export const MOCK_EMPLOYEES: Employee[] = [];
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];
