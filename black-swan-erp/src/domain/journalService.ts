import { journalRepository } from '../data/journalRepository';
import { disbursementsRepository, type DisbursementRow } from '../repositories/disbursementsRepository';
import { Expense, JournalEntry, LedgerEntry, TaxInvoice } from '../types';

import { invoiceService } from './invoices/invoiceService';

const toLedger = (entries: JournalEntry[]): LedgerEntry[] => {
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.entryNumber.localeCompare(b.entryNumber);
  });

  let runningBalance = 0;
  return sorted.map((entry) => {
    const net = entry.totalDebit - entry.totalCredit;
    runningBalance += net;

    return {
      id: entry.id,
      date: entry.date,
      documentNumber: entry.entryNumber,
      description: entry.description,
      contractId: undefined,
      disbursementId: undefined,
      department: undefined,
      type: net >= 0 ? 'DEBIT' : 'CREDIT',
      amount: Math.abs(net),
      balance: runningBalance,
    } satisfies LedgerEntry;
  });
};

const mapExpenses = (rows: DisbursementRow[]): Expense[] =>
  rows.map((d) => ({
    id: d.id,
    date: d.date,
    description: d.description || d.category || '',
    amount: Number(d.amount) || 0,
    category: (d.category as Expense['category']) || undefined,
    department: d.department || undefined,
  }));

export type AccountingSnapshot = {
  ledger: LedgerEntry[];
  invoices: TaxInvoice[];
  expenses: Expense[];
};

export const journalService = {
  async getLedger(): Promise<LedgerEntry[]> {
    const entries = await journalRepository.list();
    return toLedger(entries);
  },

  async getAccountingSnapshot(): Promise<AccountingSnapshot> {
    const [entries, invoicePage, disbursements] = await Promise.all([
      journalRepository.list(),
      invoiceService.list(200),
      disbursementsRepository.list({ pageSize: 200 }),
    ]);

    return {
      ledger: toLedger(entries),
      invoices: invoicePage.items,
      expenses: mapExpenses(disbursements),
    };
  },
};
