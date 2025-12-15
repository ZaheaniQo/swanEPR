
// ... existing enums ...

// Enums
export enum Role {
  CEO = 'CEO',
  MARKETING = 'MARKETING',
  WAREHOUSE = 'WAREHOUSE',
  ACCOUNTING = 'ACCOUNTING',
  HR = 'HR',
  PRODUCTION_MANAGER = 'PRODUCTION_MANAGER',
  PARTNER = 'PARTNER', // Read-only
}

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
  EXPENSE = 'Expense Request',
  HIRING = 'New Hire',
  LEAVE = 'Leave Request'
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requesterName: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  relatedEntityId?: string; // Contract ID, Expense ID, etc.
  amount?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
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
  name: string; // e.g. "First Installment"
  amountType: PaymentAmountType;
  value: number; // e.g. 50 (percent) or 5000 (fixed)
  amount: number; // Calculated absolute value
  dueDate?: string;
  trigger: PaymentTrigger;
  status: PaymentStatus;
  notes?: string;
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
  productId?: string; // Link to Product Registry
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
  quantity: number;
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

// Accounting Types
export interface LedgerEntry {
  id: string;
  date: string;
  documentNumber: string;
  description: string;
  contractId?: string; // Optional linkage
  department?: string;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = Deposit/In, CREDIT = Withdrawal/Out
  amount: number;
  // ZATCA / Tax Fields
  isTaxRelated?: boolean;
  taxType?: string;
  taxAmount?: number;
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

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  joinDate: string;
}

// --- FACTORY PRODUCT MODULE ---
export enum QualityLevel {
  PREMIUM = 'Premium',
  STANDARD = 'Standard',
  ECONOMY = 'Economy'
}

export interface ProductSize {
  id: string;
  size: string; // S, M, L, XL, 48, 50, etc.
  cost: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  qualityLevel: QualityLevel;
  sizes: ProductSize[];
  notes?: string;
  skuPrefix?: string;
}

// --- E-COMMERCE (Renamed to avoid conflict) ---
export interface EcommerceProduct {
    id: number;
    name: string;
    price: number;
    image: string;
    rating: number;
    availability?: 'In Stock' | 'Out of Stock';
}

export interface CartItem extends EcommerceProduct {
    quantity: number;
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
export interface CompanySettings {
  legalName: string;
  vatNumber: string;
  crNumber: string;
  address: string;
  country: string;
  logoUrl: string;
}

export enum InvoiceType {
  STANDARD = 'Standard',
  TAX = 'Tax Invoice',
  SIMPLIFIED = 'Simplified Tax Invoice'
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

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  issueDate: string;
  seller: CompanySettings;
  buyer: { name: string; isVatRegistered?: boolean } | Partial<CompanySettings>;
  items: TaxInvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  zatcaUuid?: string;
  xmlPayload?: string;
  qrCodeData?: string;
}

// --- QUOTATIONS ---
export interface QuotationItem {
  id: string;
  description: string;
  productId?: string; // Link to product
  sizeId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type QuotationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
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
  name: string; // Representative
  company: string; // Company Name
  email: string;
  phone: string;
  crNumber?: string;
  address?: string;
  type: SupplierType;
  notes?: string;
}