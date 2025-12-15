
import { InventoryItem, Employee, Contract, Project, Supplier, Customer } from './types';

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

  // Messages
  'msg.saved': { en: 'Saved Successfully', ar: 'تم الحفظ بنجاح' },
  'msg.deleted': { en: 'Deleted Successfully', ar: 'تم الحذف بنجاح' },
  'msg.fillRequired': { en: 'Please fill required fields', ar: 'يرجى تعبئة الحقول المطلوبة' },
  'msg.errorLoading': { en: 'Error loading data', ar: 'خطأ في تحميل البيانات' },
  'msg.error': { en: 'An error occurred', ar: 'حدث خطأ' },
  'msg.confirmDelete': { en: 'Are you sure you want to delete this?', ar: 'هل أنت متأكد من الحذف؟' },
};

export const MOCK_INVENTORY: InventoryItem[] = [];
export const MOCK_CONTRACTS: Contract[] = [];
export const MOCK_EMPLOYEES: Employee[] = [];
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];
