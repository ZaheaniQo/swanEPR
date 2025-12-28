import { invoiceRepository } from '../../data/invoiceRepository';
import {
  InvoiceDraftInput,
  InvoiceDraftTotals,
  InvoiceStatus,
  PaginatedResult,
  TaxInvoice,
} from '../../shared/types';
import { approvalService } from '../approvals/approvalService';
import { calculateInvoiceTotals } from './invoiceCalculator';

export const invoiceService = {
  calculateDraft: (input: InvoiceDraftInput): InvoiceDraftTotals => calculateInvoiceTotals(input),

  list: async (pageSize = 20, cursor?: string): Promise<PaginatedResult<TaxInvoice>> => {
    return invoiceRepository.list(pageSize, cursor);
  },

  getById: async (id: string): Promise<TaxInvoice | null> => {
    return invoiceRepository.getById(id);
  },

  create: async (input: InvoiceDraftInput): Promise<TaxInvoice> => {
    const totals = calculateInvoiceTotals(input);
    const newId = await invoiceRepository.create({
      customerId: input.customerId,
      buyer: input.buyer,
      items: totals.items,
      totals,
      type: input.type,
      currency: input.currency,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
    });

    const created = await invoiceRepository.getById(newId);
    if (!created) {
      throw new Error('Invoice creation failed: record not found.');
    }
    return created;
  },

  approve: async (id: string): Promise<TaxInvoice | null> => {
    const invoice = await invoiceRepository.getById(id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be approved');
    }

    await approvalService.approveEntity('invoice', id);
    return invoiceRepository.getById(id);
  },

  post: async (id: string): Promise<TaxInvoice | null> => {
    const invoice = await invoiceRepository.getById(id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new Error('Only approved invoices can be posted');
    }

    await invoiceRepository.post(id);
    return invoiceRepository.getById(id);
  },
};
