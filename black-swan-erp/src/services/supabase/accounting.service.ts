
import { supabase } from '../supabaseClient';
import { Account, AccountType, JournalEntry, JournalStatus, TaxInvoice, WorkOrder, Disbursement } from '../../types';
import { getList, create, getOne } from './core';

const TBL_ACCOUNTS = 'coa_accounts';
const TBL_JOURNALS = 'journal_entries';
const TBL_JOURNAL_LINES = 'journal_lines';

// Initial Chart of Accounts Seed Data
const DEFAULT_COA = [
  { code: '1001', name: 'Cash on Hand', type: AccountType.ASSET },
  { code: '1002', name: 'Bank Al-Rajhi', type: AccountType.ASSET },
  { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET },
  { code: '1200', name: 'Inventory Asset', type: AccountType.ASSET },
  { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
  { code: '2100', name: 'VAT Payable (Output)', type: AccountType.LIABILITY },
  { code: '2101', name: 'VAT Receivable (Input)', type: AccountType.ASSET },
  { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY },
  { code: '4000', name: 'Sales Revenue', type: AccountType.REVENUE },
  { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
  { code: '5100', name: 'Salaries Expense', type: AccountType.EXPENSE },
  { code: '5200', name: 'Rent Expense', type: AccountType.EXPENSE },
  { code: '5300', name: 'Utilities Expense', type: AccountType.EXPENSE },
  { code: '5400', name: 'General Expense', type: AccountType.EXPENSE },
];

export const accountingService = {
  
  async initCOA() {
    const { count } = await supabase.from(TBL_ACCOUNTS).select('*', { count: 'exact', head: true });
    if (count && count > 0) return; // Already initialized

    const { error } = await supabase.from(TBL_ACCOUNTS).insert(
        DEFAULT_COA.map(acc => ({ ...acc, isSystem: true }))
    );
    if (error) console.error('Error initializing COA', error);
  },

  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase.from(TBL_ACCOUNTS).select('*').order('code', { ascending: true });
    if (error) throw error;
    return data as Account[];
  },

  async getAccountByCode(code: string): Promise<Account | undefined> {
    const { data, error } = await supabase.from(TBL_ACCOUNTS).select('*').eq('code', code).single();
    if (error) return undefined;
    return data as Account;
  },

  async getTrialBalance() {
    const { data: accounts } = await supabase.from(TBL_ACCOUNTS).select('*').order('code');
    if (!accounts) return [];

    const { data: lines } = await supabase
      .from(TBL_JOURNAL_LINES)
      .select(`
        account_id,
        debit,
        credit,
        journal_entries!inner(status)
      `)
      .eq('journal_entries.status', 'POSTED');

    return accounts.map(acc => {
      const accLines = lines?.filter((l: any) => l.account_id === acc.id) || [];
      const totalDebit = accLines.reduce((sum: number, l: any) => sum + Number(l.debit), 0);
      const totalCredit = accLines.reduce((sum: number, l: any) => sum + Number(l.credit), 0);
      
      let balance = 0;
      // Assets and Expenses have normal Debit balance
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        balance = totalDebit - totalCredit;
      } else {
        // Liabilities, Equity, Revenue have normal Credit balance
        balance = totalCredit - totalDebit;
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: totalDebit,
        credit: totalCredit,
        balance: balance
      };
    });
  },

  // --- JOURNAL ENTRIES ---

  async createJournalEntry(entry: Partial<JournalEntry>): Promise<string> {
    // 1. Validate Balance
    const totalDebit = entry.lines?.reduce((sum, line) => sum + line.debit, 0) || 0;
    const totalCredit = entry.lines?.reduce((sum, line) => sum + line.credit, 0) || 0;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal Entry is unbalanced: Dr ${totalDebit} != Cr ${totalCredit}`);
    }

    const { lines, ...header } = entry;

    // 2. Insert Header
    const { data: je, error: jeError } = await supabase.from(TBL_JOURNALS).insert({
      ...header,
      status: JournalStatus.POSTED, // Auto-post for MVP
      totalDebit,
      totalCredit,
      date: entry.date || new Date().toISOString()
    }).select().single();

    if (jeError) throw jeError;

    // 3. Insert Lines
    if (lines && lines.length > 0) {
        const linesWithId = lines.map(l => ({ ...l, journalId: je.id }));
        const { error: lineError } = await supabase.from(TBL_JOURNAL_LINES).insert(linesWithId);
        if (lineError) throw lineError;
    }

    return je.id;
  },

  async getJournalEntries(): Promise<JournalEntry[]> {
    // Fetch headers with lines
    const { data, error } = await supabase
        .from(TBL_JOURNALS)
        .select(`*, lines:${TBL_JOURNAL_LINES}(*)`)
        .order('date', { ascending: false });
    
    if (error) throw error;
    return data as JournalEntry[];
  },

  // --- AUTOMATED POSTING ---

  async postSalesInvoice(invoice: TaxInvoice) {
    // 1. Get Account IDs (In a real app, these should be fetched dynamically or from settings)
    // For MVP, we use the hardcoded codes from DEFAULT_COA
    const accReceivable = await this.getAccountByCode('1100');
    const accRevenue = await this.getAccountByCode('4000');
    const accVat = await this.getAccountByCode('2100');

    if (!accReceivable || !accRevenue || !accVat) {
        throw new Error('Missing required accounts for posting (1100, 4000, or 2100)');
    }

    // 2. Create Journal Entry
    const je: Partial<JournalEntry> = {
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} - ${invoice.buyer.name}`,
        reference: invoice.invoiceNumber,
        status: JournalStatus.POSTED,
        lines: [
            // Debit Accounts Receivable (Total)
            {
                accountId: accReceivable.id,
                accountName: accReceivable.name,
                debit: invoice.totalAmount,
                credit: 0,
                description: `Invoice ${invoice.invoiceNumber}`
            },
            // Credit Sales Revenue (Subtotal)
            {
                accountId: accRevenue.id,
                accountName: accRevenue.name,
                debit: 0,
                credit: invoice.subtotal,
                description: `Revenue - ${invoice.invoiceNumber}`
            },
            // Credit VAT Payable (Tax)
            {
                accountId: accVat.id,
                accountName: accVat.name,
                debit: 0,
                credit: invoice.vatAmount,
                description: `VAT - ${invoice.invoiceNumber}`
            }
        ]
    };

    return this.createJournalEntry(je);
  },

  async postWorkOrderCompletion(wo: WorkOrder, totalCost: number) {
      // 1. Get Accounts
      const accInventory = await this.getAccountByCode('1200'); // Inventory Asset
      // In a real system, we might have separate accounts for Raw Materials vs Finished Goods
      // For now, we just debit and credit the same account to reflect transformation (or maybe different sub-accounts if we had them)
      // Let's assume 1200 is General Inventory. 
      // To make it meaningful, let's assume we have a "Cost of Goods Manufactured" or similar if we want to track flow.
      // But strictly, it's Asset -> Asset.
      
      if (!accInventory) throw new Error('Missing Inventory Account (1200)');

      // 2. Create Journal Entry
      // Debit Finished Goods (Increase)
      // Credit Raw Materials (Decrease) - effectively handled by the BOM consumption logic usually
      // But here we are just recording the value addition or transfer.
      
      // Actually, usually:
      // 1. Issue Materials: Credit Inventory (RM), Debit WIP.
      // 2. Finish Goods: Credit WIP, Debit Inventory (FG).
      
      // For this MVP, let's do a simple "Reclassification" or just assume the inventory value is updated via stock adjustments, 
      // and the accounting entry is for the "Value Added" if any, or just tracking.
      
      // Let's implement a simple "Inventory Adjustment" style entry for the finished good coming IN.
      // And we assume the raw materials going OUT are handled separately or in the same entry.
      
      // Let's keep it simple: Just record the Finished Good coming into stock value.
      // Debit Inventory (1200)
      // Credit Inventory Adjustment / WIP (Let's use 5000 COGS for now as a placeholder or create a WIP account)
      
      // Better: Let's create a WIP account in the seed data if possible, or use a generic one.
      // I'll use '5000' (COGS) as the offset for now to balance it, assuming standard costing.
      
      const je: Partial<JournalEntry> = {
        date: new Date().toISOString(),
        description: `Production Completion - ${wo.number}`,
        reference: wo.number,
        status: JournalStatus.POSTED,
        lines: [
            {
                accountId: accInventory.id,
                accountName: accInventory.name,
                debit: totalCost,
                credit: 0,
                description: `Finished Goods - ${wo.productName}`
            },
            {
                accountId: accInventory.id, // Credit the same account (Raw Materials consumed) - simplified
                accountName: accInventory.name,
                debit: 0,
                credit: totalCost,
                description: `Raw Materials Consumed`
            }
        ]
      };
      
      return this.createJournalEntry(je);
  },

  async postExpense(expense: Disbursement) {
      // 1. Determine Accounts
      // Debit: Expense Account (Default to 5400 General Expense for now)
      // Credit: Cash (1001) or Bank (1002) or AP (2000)
      
      const accExpense = await this.getAccountByCode('5400');
      let accCreditCode = '1001'; // Default Cash
      
      if (expense.paymentMethod === 'Bank Transfer' || expense.paymentMethod === 'Card') {
          accCreditCode = '1002';
      } 
      // else if (expense.paymentMethod === 'CREDIT') {
      //    accCreditCode = '2000';
      // }
      
      const accCredit = await this.getAccountByCode(accCreditCode);
      
      if (!accExpense || !accCredit) throw new Error('Missing accounts for expense posting');

      const je: Partial<JournalEntry> = {
          date: expense.date || new Date().toISOString(),
          description: `Expense: ${expense.category} - ${expense.description}`,
          reference: expense.id.substring(0, 8),
          status: JournalStatus.POSTED,
          lines: [
              {
                  accountId: accExpense.id,
                  accountName: accExpense.name,
                  debit: expense.amount,
                  credit: 0,
                  description: expense.description
              },
              {
                  accountId: accCredit.id,
                  accountName: accCredit.name,
                  debit: 0,
                  credit: expense.amount,
                  description: `Payment via ${expense.paymentMethod}`
              }
          ]
      };
      
      return this.createJournalEntry(je);
  },

  // --- REPORTING ---

  async getProfitAndLoss(startDate: string, endDate: string) {
    const trialBalance = await this.getTrialBalance();
    const revenue = trialBalance.filter((b: any) => b.type === AccountType.REVENUE).reduce((s: number, b: any) => s + b.balance, 0);
    const expense = trialBalance.filter((b: any) => b.type === AccountType.EXPENSE).reduce((s: number, b: any) => s + b.balance, 0);
    
    return {
      revenue,
      expense,
      netIncome: revenue - expense
    };
  }
};
