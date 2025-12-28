import { InvoiceDraftInput, InvoiceDraftTotals, InvoiceLineInput, TaxInvoiceItem } from '../../shared/types';

const clampNumber = (value: number, fallback = 0): number => {
  if (Number.isFinite(value)) return value;
  return fallback;
};

const toItem = (line: InvoiceLineInput): TaxInvoiceItem => {
  const quantity = clampNumber(line.quantity, 0);
  const unitPrice = clampNumber(line.unitPrice, 0);
  const vatRate = clampNumber(line.vatRate, 0.15);
  const netAmount = quantity * unitPrice;
  const vatAmount = netAmount * vatRate;
  const totalAmount = netAmount + vatAmount;

  return {
    description: line.description,
    quantity,
    unitPrice,
    netAmount,
    vatRate,
    vatAmount,
    totalAmount,
  };
};

export const calculateInvoiceTotals = (invoice: InvoiceDraftInput): InvoiceDraftTotals => {
  const items = invoice.items.map(toItem);
  const subtotal = items.reduce((sum, item) => sum + item.netAmount, 0);
  const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalAmount = subtotal + vatAmount;

  return {
    items,
    subtotal,
    vatAmount,
    totalAmount,
  };
};

export const newInvoiceLine = (): InvoiceLineInput => ({
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate: 0.15,
});

export const updateInvoiceLine = (
  lines: InvoiceLineInput[],
  index: number,
  patch: Partial<InvoiceLineInput>,
): InvoiceLineInput[] => {
  return lines.map((line, idx) => (idx === index ? { ...line, ...patch } : line));
};

export const removeInvoiceLine = (lines: InvoiceLineInput[], index: number): InvoiceLineInput[] =>
  lines.filter((_, idx) => idx !== index);
