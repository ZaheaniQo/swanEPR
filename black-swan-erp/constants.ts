
import { Role, ContractStatus, PaymentStatus, InventoryItem, Employee, Contract, TransactionType, Project, ProjectStageStatus, LedgerEntry, Invoice, Expense, ExpenseType, Supplier, SupplierType, Customer } from './types';

export const SQL_SCHEMA = `
-- (Schema remains unchanged)
`;

export const TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  // --- GENERAL ---
  'app.name': { en: 'Black Swan ERP', ar: 'نظام بلاك سوان' },
  'welcome': { en: 'Welcome', ar: 'مرحباً' },
  'search.placeholder': { en: 'Search...', ar: 'بحث...' },
  'status': { en: 'Status', ar: 'الحالة' },
  'actions': { en: 'Actions', ar: 'إجراءات' },
  'currency': { en: 'SAR', ar: 'ر.س' },
  'yes': { en: 'Yes', ar: 'نعم' },
  'no': { en: 'No', ar: 'لا' },
  
  // --- BUTTONS ---
  'btn.create': { en: 'Create New', ar: 'إنشاء جديد' },
  'btn.add': { en: 'Add', ar: 'إضافة' },
  'btn.submit': { en: 'Submit', ar: 'إرسال' },
  'btn.save': { en: 'Save', ar: 'حفظ' },
  'btn.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'btn.approve': { en: 'Approve', ar: 'اعتماد' },
  'btn.reject': { en: 'Reject', ar: 'رفض' },
  'btn.delete': { en: 'Delete', ar: 'حذف' },
  'btn.edit': { en: 'Edit', ar: 'تعديل' },
  'btn.view': { en: 'View', ar: 'عرض' },
  'btn.print': { en: 'Print', ar: 'طباعة' },
  'btn.email': { en: 'Email', ar: 'بريد إلكتروني' },
  'btn.deliveryNote': { en: 'Delivery Note', ar: 'سند تسليم' },
  'btn.convertToContract': { en: 'Convert to Contract', ar: 'تحويل إلى عقد' },
  'btn.pay': { en: 'Pay', ar: 'سداد' },
  'btn.sign': { en: 'Sign', ar: 'توقيع' },
  'btn.newExpense': { en: 'New Expense', ar: 'مصروف جديد' },

  // --- MENU ---
  'menu.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'menu.contracts': { en: 'Contracts', ar: 'العقود' },
  'menu.production': { en: 'Production', ar: 'الإنتاج' },
  'menu.inventory': { en: 'Inventory', ar: 'المخزون' },
  'menu.accounting': { en: 'Accounting', ar: 'المحاسبة' },
  'menu.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'menu.partners': { en: 'Partners', ar: 'الشركاء' },
  'menu.approvals': { en: 'Approvals', ar: 'الاعتمادات' },
  'menu.quotations': { en: 'Quotations', ar: 'عروض الأسعار' },
  'menu.receipts': { en: 'Receipts', ar: 'سندات القبض' },
  'menu.invoices': { en: 'Invoices', ar: 'الفواتير' },
  'menu.suppliers': { en: 'Suppliers', ar: 'الموردين' },
  'menu.customers': { en: 'Customers', ar: 'العملاء' },
  'menu.disbursements': { en: 'Disbursements', ar: 'المصروفات' },
  'menu.products': { en: 'Product Registry', ar: 'سجل المنتجات' },
  'menu.settings': { en: 'Settings', ar: 'الإعدادات' },

  // --- ROLES ---
  'role.ceo': { en: 'CEO', ar: 'المدير التنفيذي' },
  'role.marketing': { en: 'Marketing', ar: 'التسويق' },
  'role.warehouse': { en: 'Warehouse', ar: 'المستودع' },
  'role.accounting': { en: 'Accounting', ar: 'المحاسبة' },
  'role.hr': { en: 'HR', ar: 'الموارد البشرية' },
  'role.production_manager': { en: 'Production Mgr', ar: 'مدير الإنتاج' },
  'role.partner': { en: 'Partner', ar: 'شريك' },

  // --- DASHBOARD ---
  'dashboard.overview': { en: 'Overview', ar: 'نظرة عامة' },
  'dashboard.updated': { en: 'Updated', ar: 'تم التحديث' },
  'dashboard.activeEmployees': { en: 'Active Staff', ar: 'الموظفين النشطين' },
  'kpi.revenue': { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  'kpi.contracts': { en: 'Active Contracts', ar: 'العقود النشطة' },
  'kpi.breakeven': { en: 'Break-even Point', ar: 'نقطة التعادل' },
  'kpi.expenses': { en: 'Total Expenses', ar: 'إجمالي المصروفات' },
  'kpi.netProfit': { en: 'Net Profit', ar: 'صافي الربح' },
  'kpi.pendingApprovals': { en: 'Pending Approvals', ar: 'طلبات معلقة' },
  'kpi.sub.revenueMinusExpenses': { en: 'Revenue - Expenses', ar: 'الإيرادات - المصروفات' },
  'kpi.sub.allApproved': { en: 'All Approved', ar: 'المعتمدة فقط' },
  'kpi.sub.needsAction': { en: 'Needs Action', ar: 'يتطلب إجراء' },
  'kpi.sub.target': { en: 'Target', ar: 'الهدف' },
  'chart.financialPerformance': { en: 'Financial Performance', ar: 'الأداء المالي' },
  'chart.breakEvenAnalysis': { en: 'Break-Even Analysis', ar: 'تحليل نقطة التعادل' },
  'chart.revenue': { en: 'Revenue', ar: 'الإيرادات' },
  'chart.expenses': { en: 'Expenses', ar: 'المصروفات' },
  'chart.actualSales': { en: 'Actual Sales', ar: 'المبيعات الفعلية' },
  'chart.target': { en: 'Target', ar: 'الهدف' },

  // --- CONTRACTS ---
  'contracts.title': { en: 'Contracts Management', ar: 'إدارة العقود' },
  'contracts.subtitle': { en: 'Manage lifecycles, milestones & payments', ar: 'إدارة دورة حياة العقود والدفعات' },
  'contracts.builder': { en: 'Contract Builder', ar: 'منشئ العقود' },
  'contracts.milestones': { en: 'Milestones & Payments', ar: 'الدفعات والمراحل' },
  'contracts.relatedExpenses': { en: 'Related Expenses', ar: 'المصروفات المرتبطة' },
  'col.contractNo': { en: 'Contract #', ar: 'رقم العقد' },
  'col.client': { en: 'Client', ar: 'العميل' },
  'col.title': { en: 'Title', ar: 'العنوان' },
  'col.value': { en: 'Value', ar: 'القيمة' },
  'col.status': { en: 'Status', ar: 'الحالة' },

  // --- INVENTORY ---
  'inventory.title': { en: 'Inventory Management', ar: 'إدارة المخزون' },
  'inventory.subtitle': { en: 'Track materials and finished goods', ar: 'تتبع المواد والمنتجات الجاهزة' },
  'btn.receive': { en: 'Receive (In)', ar: 'استلام (توريد)' },
  'btn.issue': { en: 'Issue (Out)', ar: 'صرف (تصدير)' },
  'filter.all': { en: 'All', ar: 'الكل' },
  'filter.material': { en: 'Material', ar: 'مادة خام' },
  'filter.product': { en: 'Product', ar: 'منتج جاهز' },
  'col.code': { en: 'Code', ar: 'الكود' },
  'col.item': { en: 'Item', ar: 'الصنف' },
  'col.type': { en: 'Type', ar: 'النوع' },
  'col.stock': { en: 'Stock', ar: 'المخزون' },
  'col.cost': { en: 'Unit Cost', ar: 'تلفة الوحدة' },
  'modal.receiveStock': { en: 'Receive Stock', ar: 'استلام مخزون' },
  'modal.issueStock': { en: 'Issue Stock', ar: 'صرف مخزون' },
  'msg.stockSuccess': { en: 'Stock Updated', ar: 'تم تحديث المخزون' },

  // --- SUPPLIERS ---
  'suppliers.title': { en: 'Suppliers', ar: 'الموردين' },
  'suppliers.subtitle': { en: 'Manage vendor profiles and procurement', ar: 'إدارة ملفات الموردين والمشتريات' },
  'col.company': { en: 'Company', ar: 'الشركة' },
  'col.contact': { en: 'Contact', ar: 'جهة الاتصال' },
  'col.phone': { en: 'Phone', ar: 'الهاتف' },
  'col.email': { en: 'Email', ar: 'البريد' },
  'col.supplierType': { en: 'Type', ar: 'النشاط' },
  'col.totalPaid': { en: 'Total Paid', ar: 'إجمالي المدفوعات' },
  'modal.addSupplier': { en: 'Add Supplier', ar: 'إضافة مورد' },
  'modal.editSupplier': { en: 'Edit Supplier', ar: 'تعديل مورد' },

  // --- CUSTOMERS ---
  'customers.title': { en: 'Customers', ar: 'العملاء' },
  'customers.subtitle': { en: 'Manage client profiles', ar: 'إدارة ملفات العملاء' },

  // --- DISBURSEMENTS (Expenses) ---
  'disbursements.title': { en: 'Financial Disbursements', ar: 'المصروفات المالية' },
  'disbursements.subtitle': { en: 'Track and approve company expenses', ar: 'تتبع واعتماد مصروفات الشركة' },
  'col.date': { en: 'Date', ar: 'التاريخ' },
  'col.category': { en: 'Category', ar: 'التصنيف' },
  'col.relatedTo': { en: 'Related To', ar: 'مرتبط بـ' },
  'col.method': { en: 'Method', ar: 'طريقة الدفع' },
  'col.amount': { en: 'Amount', ar: 'المبلغ' },
  'modal.newDisbursement': { en: 'New Disbursement Request', ar: 'طلب صرف مالي جديد' },
  'lbl.category': { en: 'Category', ar: 'التصنيف' },
  'lbl.description': { en: 'Description', ar: 'الوصف' },
  'lbl.paymentMethod': { en: 'Payment Method', ar: 'طريقة الدفع' },
  'lbl.relatedContract': { en: 'Related Contract', ar: 'عقد مرتبط' },
  'lbl.relatedProject': { en: 'Related Project', ar: 'مشروع مرتبط' },
  'lbl.supplier': { en: 'Supplier', ar: 'المورد' },

  // --- PRODUCTS REGISTRY ---
  'products.title': { en: 'Products Registry', ar: 'سجل المنتجات' },
  'products.subtitle': { en: 'Manage factory products & pricing', ar: 'إدارة المنتجات والتسعير' },
  'btn.addProduct': { en: 'Add Product', ar: 'إضافة منتج' },
  'col.productName': { en: 'Product Name', ar: 'اسم المنتج' },
  'col.size': { en: 'Size', ar: 'المقاس' },
  'col.price': { en: 'Price', ar: 'السعر' },
  'col.margin': { en: 'Margin', ar: 'الربح' },
  'lbl.quality': { en: 'Quality Level', ar: 'مستوى الجودة' },
  'lbl.sku': { en: 'SKU Prefix', ar: 'رمز SKU' },
  'lbl.variants': { en: 'Size Variants', ar: 'المقاسات والأسعار' },

  // --- PRODUCTION ---
  'production.title': { en: 'Production Floor', ar: 'ساحة الإنتاج' },
  'production.subtitle': { en: 'Track project stages', ar: 'تتبع مراحل المشاريع' },
  'production.progress': { en: 'Progress', ar: 'الإنجاز' },
  'production.noProjects': { en: 'No Active Projects', ar: 'لا توجد مشاريع نشطة' },
  'stage.Cutting': { en: 'Cutting', ar: 'القص' },
  'stage.Sewing': { en: 'Sewing', ar: 'الخياطة' },
  'stage.Embroidery': { en: 'Embroidery', ar: 'التطريز' },
  'stage.Ironing': { en: 'Ironing', ar: 'الكي' },
  'stage.Packing': { en: 'Packing', ar: 'التغليف' },
  'stage.start': { en: 'Start', ar: 'بدء' },
  'stage.complete': { en: 'Complete', ar: 'إكمال' },
  'stage.delay': { en: 'Delay', ar: 'تأخير' },

  // --- ACCOUNTING ---
  'accounting.title': { en: 'Accounting', ar: 'المحاسبة' },
  'accounting.subtitle': { en: 'General Ledger & Financials', ar: 'دفتر الأستاذ والمالية' },
  'tab.ledger': { en: 'General Ledger', ar: 'دفتر الأستاذ العام' },
  'tab.invoices': { en: 'Invoices', ar: 'الفواتير' },
  'tab.expenses': { en: 'Expenses', ar: 'المصروفات' },
  'col.debit': { en: 'Debit (In)', ar: 'مدين (دخول)' },
  'col.credit': { en: 'Credit (Out)', ar: 'دائن (خروج)' },
  'col.balance': { en: 'Balance', ar: 'الرصيد' },

  // --- APPROVALS ---
  'approvals.title': { en: 'Approvals Center', ar: 'مركز الموافقات' },
  'approvals.subtitle': { en: 'Manage pending requests', ar: 'إدارة الطلبات المعلقة' },
  'approvals.pending': { en: 'Pending Requests', ar: 'طلبات معلقة' },
  'approvals.history': { en: 'History', ar: 'السجل' },

  // --- QUOTATIONS ---
  'quotations.title': { en: 'Price Quotations', ar: 'عروض الأسعار' },
  'receipts.title': { en: 'Payment Receipts', ar: 'سندات القبض' },
  'invoices.title': { en: 'Tax Invoices', ar: 'الفواتير الضريبية' },

  // --- MESSAGES ---
  'msg.approved': { en: 'Request Approved', ar: 'تم اعتماد الطلب' },
  'msg.rejected': { en: 'Request Rejected', ar: 'تم رفض الطلب' },
  'msg.saved': { en: 'Saved Successfully', ar: 'تم الحفظ بنجاح' },
  'msg.deleted': { en: 'Deleted Successfully', ar: 'تم الحذف بنجاح' },
  'msg.fillRequired': { en: 'Please fill required fields', ar: 'يرجى تعبئة الحقول المطلوبة' },
};

// ... (Rest of constants.ts remains mostly unchanged, mock data omitted for brevity)
export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'mat1', code: 'M001', name: 'Cotton Fabric White', type: 'Material', quantity: 5000, unit: 'Meters', reorderLevel: 1000, cost: 5.5 },
  { id: 'mat2', code: 'M002', name: 'Polyester Thread Blue', type: 'Material', quantity: 200, unit: 'Spools', reorderLevel: 50, cost: 2.0 },
];
export const MOCK_CONTRACTS: Contract[] = [];
export const MOCK_EMPLOYEES: Employee[] = [];
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];