import { useCallback, useState } from 'react';

import {
  InvoiceDraftInput,
  InvoiceLineInput,
  InvoiceStatus,
  PaginatedResult,
  TaxInvoice,
} from '../../shared/types';
import {
  calculateInvoiceTotals,
  newInvoiceLine,
  removeInvoiceLine,
  updateInvoiceLine,
} from '../invoices/invoiceCalculator';
import { invoiceService } from '../invoices/invoiceService';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadInvoices = useCallback(
    async (options: { reset?: boolean; pageSize?: number } = {}): Promise<PaginatedResult<TaxInvoice>> => {
      if (loading) return { items: invoices, hasMore, lastId: cursor };
      setLoading(true);

      try {
        const { reset = false, pageSize = 20 } = options;
        const result = await invoiceService.list(pageSize, reset ? undefined : cursor || undefined);
        setHasMore(result.hasMore);
        setCursor(result.lastId || null);
        setInvoices((prev) => (reset ? result.items : [...prev, ...result.items]));
        return result;
      } finally {
        setLoading(false);
      }
    },
    [cursor, hasMore, invoices, loading],
  );

  const getInvoice = useCallback(async (id: string) => invoiceService.getById(id), []);

  const createInvoice = useCallback(async (draft: InvoiceDraftInput) => {
    return invoiceService.create(draft);
  }, []);

  const approveInvoice = useCallback(async (id: string) => {
    return invoiceService.approve(id);
  }, []);

  const postInvoice = useCallback(async (id: string) => {
    return invoiceService.post(id);
  }, []);

  const addLine = useCallback((lines: InvoiceLineInput[]) => [...lines, newInvoiceLine()], []);
  const applyLineUpdate = useCallback(
    (lines: InvoiceLineInput[], index: number, patch: Partial<InvoiceLineInput>) =>
      updateInvoiceLine(lines, index, patch),
    [],
  );
  const deleteLine = useCallback((lines: InvoiceLineInput[], index: number) => removeInvoiceLine(lines, index), []);

  const calculateTotals = useCallback((draft: InvoiceDraftInput) => calculateInvoiceTotals(draft), []);

  const canPost = (invoice?: TaxInvoice | null) => invoice?.status === InvoiceStatus.APPROVED;
  const canApprove = (invoice?: TaxInvoice | null) => invoice?.status === InvoiceStatus.DRAFT;

  return {
    invoices,
    hasMore,
    loading,
    loadInvoices,
    getInvoice,
    createInvoice,
    approveInvoice,
    postInvoice,
    addLine,
    applyLineUpdate,
    deleteLine,
    calculateTotals,
    canPost,
    canApprove,
  };
};
