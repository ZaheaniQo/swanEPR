
// ... existing enums ...

// Enums
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CEO = 'CEO',
  MARKETING = 'MARKETING',
  WAREHOUSE = 'WAREHOUSE',
  ACCOUNTING = 'ACCOUNTING',
  HR = 'HR',
  PRODUCTION_MANAGER = 'PRODUCTION_MANAGER',
  PARTNER = 'PARTNER', // Read-only
  EMPLOYEE = 'EMPLOYEE'
}

export type ProfileStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export enum ContractStatus {
  DRAFT = 'Draft',
  AWAITING_SIGNATURE = 'Awaiting Signature',
  SIGNED_CLIENT = 'Signed (Client)',
  AWAITING_CEO_APPROVAL = 'Awaiting CEO Approval',
  AWAITING_PAYMENT_1 = 'Awaiting 1st Payment',
  IN_PRODUCTION = 'In Production',
  READY_DELIVERY = 'Ready for Delivery',
  DELIVERED = 'Delivered',
  AWAITING_PAYMENT_2 = 'Awaiting 2nd Payment',
  CLOSED = 'Closed',
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
}

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
}

export enum ProjectStageStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  DELAYED = 'Delayed',
}

export type InventoryTransactionType = 'IN' | 'OUT';

export enum InventoryMovementType {
  RECEIPT = 'RECEIPT', // From Supplier
  ISSUE = 'ISSUE', // To Production/Sales
  ADJUSTMENT = 'ADJUSTMENT', // Stock Check
  RETURN = 'RETURN' // From Production/Customer
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: InventoryMovementType;
  quantity: number;
  referenceType: 'PO' | 'SO' | 'PRODUCTION' | 'ADJUSTMENT';
  referenceId: string;
  date: string;
  userId: string;
  notes?: string;
}

export enum ExpenseType {
  FIXED_MONTHLY = 'Fixed Monthly',
  SEMI_ANNUAL = 'Semi-Annual',
  ANNUAL = 'Annual',
  OPERATIONAL = 'Operational',
}

// --- NEW APPROVALS TYPES ---
export enum ApprovalType {
  CONTRACT = 'Contract Approval',
  PAYMENT = 'Payment Release',
  EXPENSE = 'Expense Request', // Used for Disbursements
  HIRING = 'New Hire',
  LEAVE = 'Leave Request',
  INVOICE = 'Invoice Approval',
  JOURNAL = 'Journal Entry',
  ACCESS = 'Access Request'
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  relatedEntityId?: string; // Contract ID, Expense ID, etc.
  amount?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  approverId?: string;
  approvedAt?: string;
  targetType?: string;
  targetId?: string;
  decisionBy?: string;
  decisionAt?: string;
  decisionNote?: string;
  payload?: Record<string, any>;
}

export interface AccessRequest {
  id: string;
  email: string;
  fullName?: string;
  status: ProfileStatus;
  role?: Role;
  createdAt?: string;
}

// --- FINANCIAL DISBURSEMENTS ---
export type DisbursementStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Disbursement {
  id: string;
  date: string;
  category: string; // rent, salaries, materials, etc.
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'Card';
  supplierId?: string;
  contractId?: string;
  projectId?: string;
  description: string;
  attachmentUrl?: string;
  approvalStatus: DisbursementStatus;
  status?: DisbursementStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Virtual/Joined fields
  supplierName?: string;
  contractTitle?: string;
  projectName?: string;
}

export interface DeliveryNote {
  id: string;
  contractId: string;
  contractNumber: string;
  clientName: string;
  deliveryDate: string;
  items: {
    productName: string;
    quantity: number;
    notes?: string;
  }[];
  receivedBy?: string;
  signature?: string;
}

// --- NEW CONTRACT BUILDER TYPES ---

export enum PaymentTrigger {
  ON_SIGNING = 'On Signing',
  BEFORE_DELIVERY = 'Before Delivery',
  ON_DELIVERY = 'On Delivery',
  AFTER_DELIVERY = 'After Delivery',
  CUSTOM = 'Custom'
}

export enum PaymentAmountType {
  PERCENTAGE = 'Percentage',
  FIXED = 'Fixed'
}

export interface ContractParty {
  legalName: string;
  representativeName?: string;
  address?: string;
  email?: string;
  phone?: string;
  crNumber?: string; // Commercial Registration
  vatNumber?: string;
}

export interface PaymentTerm {
  id: string;
  contractId?: string;
  name: string; // e.g. "First Installment"
  amountType: PaymentAmountType;
  value: number; // e.g. 50 (percent) or 5000 (fixed)
  amount: number; // Calculated absolute value
  dueDate?: string;
  trigger: PaymentTrigger;
  status: PaymentStatus;
  notes?: string;
  paidAt?: string;
}

export interface ContractClause {
  id: string;
  title: string;
  body: string;
  isCustom: boolean;
  enabled: boolean;
}

// ----------------------------------

export interface User {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string;
}

// Updated Customer Interface (merging legacy Client)
export interface Customer {
  id: string;
  name: string; // Representative Name
  company: string; // Legal Name
  email: string;
  phone: string;
  vatNumber?: string;
  address?: string;
  notes?: string;
}

// Alias for backward compatibility if needed, though we will migrate to Customer
export type Client = Customer;

export interface ContractItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
  sizeId?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string; // Kept for backward compat, acts as Party B Name
  title: string;
  totalValue: number;
  status: ContractStatus;
  startDate: string;
  deliveryDate: string;
  items: ContractItem[];
  
  // Extended Fields for Builder
  partyA?: ContractParty; // Us (Provider)
  partyB?: ContractParty; // Them (Client)
  paymentTerms?: PaymentTerm[];
  clauses?: ContractClause[];
  currency?: string;
  
  // Legacy Fields (Computed or Mapped)
  payment1Status: PaymentStatus;
  payment2Status: PaymentStatus;
  
  createdAt: string;
  ownerId: string; // User ID
  notes?: string;
  clientSignature?: string; 
  ceoSignature?: string; 
}

export interface Project {
  id: string;
  contractId: string;
  contractNumber: string; // Reference
  name: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Delivered';
  progress: number;
  stages: ProjectStage[];
}

export interface ProjectStage {
  id: string;
  name: 'Cutting' | 'Sewing' | 'Embroidery' | 'Ironing' | 'Packing';
  status: ProjectStageStatus;
  assignedTo?: string; // Employee ID
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  type: 'Material' | 'Product';
  quantity: number; // Derived/Cached
  unit: string;
  reorderLevel: number;
  cost: number; // Unit cost
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: InventoryTransactionType;
  quantity: number;
  date: string;
  user: string;
  reason?: string;
}

// --- DOUBLE-ENTRY ACCOUNTING TYPES ---

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface Account {
  id: string;
  code: string; // e.g., '1001'
  name: string; // e.g., 'Cash on Hand'
  type: AccountType;
  description?: string;
  parentAccountId?: string; // For hierarchy
  isSystem?: boolean; // Cannot be deleted
  balance?: number; // Cached balance (optional, risky if not managed well)
}

export enum JournalStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOID = 'VOID'
}

export interface JournalLine {
  accountId: string;
  accountName?: string; // Denormalized for display
  costCenterId?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // Auto-increment or UUID
  date: string; // Transaction date
  description: string;
  reference?: string; // e.g., Invoice #, Receipt #
  status: JournalStatus;
  lines: JournalLine[];
  fiscalPeriodId?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  postedBy?: string;
  
  // Totals for validation check
  totalDebit: number;
  totalCredit: number;
}

// LedgerEntry for legacy/simple view mapping
export interface LedgerEntry {
  id: string;
  date: string;
  documentNumber: string;
  description: string;
  contractId?: string;
  disbursementId?: string;
  department?: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance?: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseType;
  department?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  contractId: string;
  contractTitle: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  type: 'First Payment' | 'Second Payment';
}

// --- HR & EMPLOYEE ---
export interface Employee {
  id: string;
  name: string;
  role: string;
  systemRole?: Role; // System access role
  department: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  joinDate: string;
  contractDurationDays?: number;
  iqamaExpiry?: string;
  passportExpiry?: string;
  
  // Personal Info
  nationality?: string;
  nationalId?: string; // ID / Iqama
  email?: string;
  phone?: string;
  photoUrl?: string;
  avatarUrl?: string;
  
  // Employment
  contractType?: 'Full-time' | 'Part-time' | 'Contractor';
  iban?: string;
  bankName?: string;
  adminNotes?: string;
  disabled?: boolean;

  // Financials
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  // Computed total = basic + housing + transport + other
  
  // Leave
  annualLeaveBalance: number; // Days
}

export interface LeaveRecord {
    id: string;
    employeeId: string;
    type: 'Annual' | 'Sick' | 'Unpaid';
    startDate: string;
    endDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    reason: string;
}

// E-commerce
export interface Product {
    id: string;
    name: string;
    description?: string;
    category?: string;
    qualityLevel?: QualityLevel;
    skuPrefix?: string;
    sku?: string;
    baseUnit?: string;
    avgCost?: number;
    sizes: ProductSize[];
    notes?: string;
    // Legacy support for ecommerce demo
    price?: number;
    image?: string;
    rating?: number;
    availability?: 'In Stock' | 'Out of Stock';
}

export interface ProductSize {
  id: string;
  size: string; 
  cost: number;
  price: number;
}

export enum QualityLevel {
  PREMIUM = 'Premium',
  STANDARD = 'Standard',
  ECONOMY = 'Economy'
}

export interface CartItem extends Product {
    quantity: number;
    price: number; // Resolved price based on selection
}

export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  date: string;
  totalAmount: number;
  status: 'Draft' | 'Confirmed' | 'Invoiced' | 'Shipped';
  items: CartItem[];
}

export interface LanguageContextType {
  lang: 'en' | 'ar';
  t: (key: string) => string;
  toggleLang: () => void;
  dir: 'ltr' | 'rtl';
}

// New ZATCA / Tax Types
export interface BrandingSettings {
  primaryColor: string;
  accentColor: string;
  mode: 'light' | 'dark' | 'system';
  logoUrl?: string;
  fontFamily: string;
}

export interface CompanySettings {
  legalName: string;
  vatNumber: string;
  crNumber: string;
  address: string;
  country: string;
  logoUrl: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  iban?: string;
  
  // Zakat Config
  zakatEntityType?: 'Holdings' | 'Enterprise' | 'Mixed' | 'Company' | 'NonProfit';
  calendarType?: 'Gregorian' | 'Hijri';

  // Branding
  branding?: BrandingSettings;
}

export enum InvoiceType {
  STANDARD = 'Standard',
  TAX = 'Tax Invoice',
  SIMPLIFIED = 'Simplified Tax Invoice'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  VOID = 'VOID'
}

export interface TaxInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export interface ZatcaInfo {
  uuid: string;
  invoiceHash: string;
  previousHash: string;
  icv: number; // Invoice Counter Value
  qrCode: string; // Base64 TLV
  complianceStatus: 'DRAFT' | 'REPORTED' | 'CLEARED' | 'REJECTED' | 'NON_COMPLIANT';
  xmlUrl?: string;
  submissionDate?: string;
  complianceIssues?: string[];
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  issueDate: string;
  dueDate?: string;
  seller: CompanySettings;
  buyer: { name: string; isVatRegistered?: boolean; vatNumber?: string; address?: string };
  items: TaxInvoiceItem[]; // Populated from subcollection in UI
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  
  // Metadata for Governance
  approval?: {
    approvedBy: string;
    approvedAt: string;
  };
  posting?: {
    postedBy: string;
    postedAt: string;
    journalEntryId: string;
  };

  // ZATCA Compliance
  zatca?: ZatcaInfo;
  
  // Legacy fields for UI compatibility
  zatcaUuid?: string;
  xmlPayload?: string;
  qrCodeData?: string;
  
  createdBy: string;
  updatedAt?: string;
  
  // Credit Note Link
  originalInvoiceId?: string;
  isCreditNote?: boolean;
}

// --- QUOTATIONS ---
export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string;
  sizeId?: string;
}

export type QuotationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerAddress?: string;
  customerVat?: string;
  date: string;
  expiryDate: string;
  items: QuotationItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: QuotationStatus;
  notes?: string;
}

// --- RECEIPTS ---
export interface Receipt {
  id: string;
  receiptNumber: string;
  contractId: string;
  contractTitle: string;
  milestoneId?: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'POS';
  referenceNumber?: string;
  notes?: string;
  attachmentUrl?: string;
}

// --- SUPPLIERS ---
export enum SupplierType {
  RAW_MATERIAL = 'Raw Material',
  LOGISTICS = 'Logistics',
  SUBCONTRACTOR = 'Subcontractor',
  EQUIPMENT = 'Equipment / Maintenance',
  OTHER = 'Other'
}

export interface Supplier {
  id: string;
  name: string; // Representative or Company Name
  company?: string; // Company Name (Optional)
  contactPerson?: string;
  email: string;
  phone: string;
  vatNumber?: string;
  crNumber?: string;
  address?: string;
  type: SupplierType;
  notes?: string;
}

// --- COST CENTERS ---
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  type?: 'Department' | 'Project' | 'Location';
  isActive: boolean;
}

// --- INVENTORY & WAREHOUSES ---
export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isActive: boolean;
}

export interface InventoryStock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reorderLevel: number;
  locationBin?: string;
  
  // Joined fields
  productName?: string;
  warehouseName?: string;
}

export interface LandedCost {
  id: string;
  receiptId?: string;
  description: string;
  amount: number;
  allocationMethod: 'VALUE' | 'QUANTITY' | 'WEIGHT';
  status: 'DRAFT' | 'ALLOCATED';
}

// --- FIXED ASSETS ---
export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE'
}

export interface AssetCategory {
  id: string;
  name: string;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  assetAccountId?: string;
  accumulatedDepreciationAccountId?: string;
  depreciationExpenseAccountId?: string;
}

export interface Asset {
  id: string;
  name: string;
  code?: string;
  categoryId?: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  status: 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';
  location?: string;
  serialNumber?: string;
  
  // Joined
  categoryName?: string;
}

export interface AssetDepreciationSchedule {
  id: string;
  assetId: string;
  fiscalYear: number;
  period: number;
  amount: number;
  isPosted: boolean;
  journalEntryId?: string;
}

// --- MANUFACTURING ---
export interface BillOfMaterials {
  id: string;
  productId: string;
  name: string;
  version: string;
  isActive: boolean;
  items?: BOMItem[];
  
  code?: string;
  outputQuantity?: number;
  uom?: string;
  
  // Joined
  productName?: string;
}

export interface BOMItem {
  id: string;
  bomId: string;
  componentProductId: string;
  quantity: number;
  wastagePercent: number;
  
  // Joined
  componentName?: string;
  componentUnit?: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  bomId?: string;
  productId: string;
  quantityPlanned: number;
  quantityProduced: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  dueDate?: string;
  warehouseId?: string;
  notes?: string;
  
  // Joined
  productName?: string;
  bomName?: string;
}

// --- HR & PAYROLL ---
export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  gosiDeductionPercent: number;
  effectiveDate: string;
  createdAt?: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  totalAmount: number;
  processedAt?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  status: 'PENDING' | 'PAID';
  
  // Joined
  employeeName?: string;
}

// --- AUDIT LOG ---
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  hash: string; // Cryptographic hash of the action details for immutability check
}

// --- COMPLIANCE REPORT ---
export interface ComplianceAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  entityId?: string;
  entityType?: 'Invoice' | 'VAT' | 'Zakat' | 'Security';
  date: string;
}
