import { supabase } from '../lib/supabase';
import {
  BuyerInfo,
  InvoiceDraftTotals,
  InvoiceStatus,
  InvoiceType,
  PaginatedResult,
  TaxInvoice,
  TaxInvoiceItem,
} from '../shared/types';

const INVOICE_COLUMNS =
  'id, invoice_number, type, issue_date, due_date, status, currency, subtotal, vat_amount, total_amount, buyer, seller, zatca_uuid, qr_code, created_by, updated_at, posting:posting_meta(journal_entry_id, posted_by, posted_at), items:invoice_items(*)';

type InvoiceItemRow = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount?: number | null;
  net_amount?: number | null;
  total_amount?: number | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  type: InvoiceType;
  issue_date: string;
  due_date?: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  buyer?: BuyerInfo & { legalName?: string; name?: string; vat_number?: string };
  seller?: Record<string, unknown>;
  zatca_uuid?: string | null;
  qr_code?: string | null;
  created_by: string;
  updated_at?: string | null;
  posting?: { journal_entry_id?: string | null; posted_by?: string | null; posted_at?: string | null } | null;
  items?: InvoiceItemRow[];
};

const mapInvoiceItem = (row: InvoiceItemRow): TaxInvoiceItem => {
  const quantity = Number(row.quantity ?? 0);
  const unitPrice = Number(row.unit_price ?? 0);
  const vatRate = Number(row.vat_rate ?? 0.15);
  const netAmount = Number(row.net_amount ?? quantity * unitPrice);
  const vatAmount = Number(row.vat_amount ?? netAmount * vatRate);
  const totalAmount = Number(row.total_amount ?? netAmount + vatAmount);

  return {
    description: row.description,
    quantity,
    unitPrice,
    netAmount,
    vatRate,
    vatAmount,
    totalAmount,
  };
};

const mapInvoiceRow = (row: InvoiceRow): TaxInvoice => {
  const buyer = row.buyer || { name: '' };
  const items = (row.items || []).map(mapInvoiceItem);
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    type: row.type,
    issueDate: row.issue_date,
    dueDate: row.due_date || undefined,
    seller: (row.seller as any) || { legalName: 'Unknown Seller', vatNumber: '', address: '' },
    buyer: {
      name: buyer.name || buyer.legalName || '',
      legalName: buyer.legalName,
      vatNumber: buyer.vatNumber || buyer.vat_number,
      address: buyer.address,
      isVatRegistered: buyer.isVatRegistered,
    },
    items,
    subtotal: Number(row.subtotal || 0),
    vatAmount: Number(row.vat_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    currency: row.currency || 'SAR',
    status: row.status,
    zatcaUuid: row.zatca_uuid || undefined,
    qrCodeData: row.qr_code || undefined,
    posting: row.posting?.journal_entry_id
      ? {
          journalEntryId: row.posting.journal_entry_id,
          postedBy: row.posting.posted_by || 'system',
          postedAt: row.posting.posted_at || '',
        }
      : undefined,
    createdBy: row.created_by,
    updatedAt: row.updated_at || undefined,
  };
};

export type InvoiceCreatePayload = {
  customerId?: string;
  buyer: BuyerInfo;
  items: TaxInvoiceItem[];
  totals: InvoiceDraftTotals;
  type: InvoiceType;
  currency: string;
  issueDate?: string;
  dueDate?: string;
};

export const invoiceRepository = {
  async list(pageSize = 20, cursor?: string): Promise<PaginatedResult<TaxInvoice>> {
    let query = supabase.from('invoices').select(INVOICE_COLUMNS).order('created_at', { ascending: false }).limit(pageSize);
    if (cursor) {
      query = query.lt('id', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as InvoiceRow[];
    const items = rows.map(mapInvoiceRow);

    return {
      items,
      hasMore: rows.length === pageSize,
      lastId: items.length ? items[items.length - 1].id : null,
    };
  },

  async getById(id: string): Promise<TaxInvoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapInvoiceRow(data as InvoiceRow);
  },

  async create(payload: InvoiceCreatePayload): Promise<string> {
    const itemsPayload = payload.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: item.vatRate,
    }));

    const { data, error } = await supabase.rpc('create_invoice_secure', {
      p_invoice: {
        invoice_number: undefined,
        type: payload.type,
        customer_id: payload.customerId,
        buyer: payload.buyer,
        currency: payload.currency,
        issue_date: payload.issueDate || new Date().toISOString(),
        due_date: payload.dueDate,
        subtotal: payload.totals.subtotal,
        vat_amount: payload.totals.vatAmount,
        total_amount: payload.totals.totalAmount,
      },
      p_items: itemsPayload,
    });

    if (error) throw error;
    return (data as { id: string }).id;
  },

  async post(id: string): Promise<void> {
    const { error } = await supabase.rpc('post_invoice_secure', {
      p_invoice_id: id,
    });
    if (error) throw error;
  },

  async setStatus(id: string, status: InvoiceStatus): Promise<void> {
    const { error } = await supabase.rpc('set_invoice_status_secure', {
      p_invoice_id: id,
      p_status: status,
    });
    if (error) throw error;
  },
};
