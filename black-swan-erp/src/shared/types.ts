import type { InvoiceType, TaxInvoiceItem } from '../types';

export type PaginatedResult<T> = {
  items: T[];
  lastId?: string | null;
  hasMore: boolean;
};

export type BuyerInfo = {
  name: string;
  legalName?: string;
  vatNumber?: string;
  address?: string;
  isVatRegistered?: boolean;
};

export type InvoiceLineInput = {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export type InvoiceDraftInput = {
  customerId?: string;
  buyer: BuyerInfo;
  items: InvoiceLineInput[];
  currency: string;
  type: InvoiceType;
  issueDate?: string;
  dueDate?: string;
};

export type InvoiceDraftTotals = {
  items: TaxInvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
};

export type ApprovalTarget = 'invoice' | 'disbursement' | 'payroll_run' | 'contract';

export { InvoiceStatus, InvoiceType, Role } from '../types';
export type { Customer, Product, TaxInvoice, TaxInvoiceItem } from '../types';
