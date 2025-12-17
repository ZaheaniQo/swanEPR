
export * from './src/types';
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