
import { supabase } from '../supabaseClient';
import { TaxInvoice, InvoiceType, AuditLog, AccountType } from "../../types";
import { accountingService } from "./accounting.service";

const TBL_AUDIT = 'audit_logs';
const TBL_INVOICES = 'invoices';

export const complianceService = {

  // --- VAT REPORTING ---
  
  async getVATReport(startDate: string, endDate: string) {
    // 1. Output VAT (Sales)
    const { data: invoices, error } = await supabase
        .from(TBL_INVOICES)
        .select('*')
        .gte('issueDate', startDate)
        .lte('issueDate', endDate)
        .in('status', ['POSTED', 'SENT_TO_ZATCA']); // Assuming 'PAID' or 'POSTED' implies tax liability

    if (error) throw error;

    const standardInvoices = invoices.filter((i: any) => i.type === InvoiceType.STANDARD);
    const simplifiedInvoices = invoices.filter((i: any) => i.type === InvoiceType.SIMPLIFIED);

    const outputVat = invoices.reduce((sum: number, inv: any) => sum + inv.vatAmount, 0);
    const totalSales = invoices.reduce((sum: number, inv: any) => sum + inv.subtotal, 0);

    // 2. Input VAT (Purchases)
    // Simplified logic: querying GL lines for VAT Receivable account
    // Ideally you query a 'bills' or 'expenses' table
    const ledger = await accountingService.getJournalEntries();
    
    // Find account ID for "VAT Receivable"
    const accounts = await accountingService.getAccounts();
    const vatInputAcc = accounts.find(a => a.code === '2101'); 

    let inputVat = 0;
    if (vatInputAcc) {
        const inputVatEntries = ledger.filter(
            j => j.date >= startDate && j.date <= endDate && 
            j.lines.some(l => l.accountId === vatInputAcc.id)
        );
        
        inputVat = inputVatEntries.reduce((sum, j) => {
            const line = j.lines.find(l => l.accountId === vatInputAcc.id);
            return sum + (line ? line.debit : 0); 
        }, 0);
    }

    return {
      period: { start: startDate, end: endDate },
      output: {
        standardCount: standardInvoices.length,
        simplifiedCount: simplifiedInvoices.length,
        totalSales,
        totalVat: outputVat
      },
      input: {
        totalPurchases: inputVat * 6.67, // Approx base if 15%
        totalVat: inputVat
      },
      netPayable: outputVat - inputVat
    };
  },

  // --- ZAKAT DATA PACK ---

  async generateZakatDataPack(year: number) {
    const pl = await accountingService.getProfitAndLoss(`${year}-01-01`, `${year}-12-31`);
    const trialBalance = await accountingService.getTrialBalance();
    
    const assets = trialBalance.filter(tb => tb.type === AccountType.ASSET);
    const liabilities = trialBalance.filter(tb => tb.type === AccountType.LIABILITY);
    const equity = trialBalance.filter(tb => tb.type === AccountType.EQUITY);

    const equityTotal = equity.reduce((s, i) => s + i.balance, 0);
    const fixedAssets = assets.filter(a => a.name.includes('Equipment') || a.name.includes('Building')).reduce((s, i) => s + i.balance, 0);
    const netProfit = pl.netIncome;

    const zakatBase = Math.abs(equityTotal) + netProfit - fixedAssets;
    const estimatedZakat = zakatBase > 0 ? zakatBase * 0.025 : 0;

    return {
        year,
        generatedAt: new Date().toISOString(),
        financials: {
            revenue: pl.revenue,
            expenses: pl.expense,
            netProfit: pl.netIncome,
            totalAssets: assets.reduce((s, i) => s + i.balance, 0),
            totalLiabilities: liabilities.reduce((s, i) => s + i.balance, 0)
        },
        zakatEstimate: {
            base: zakatBase,
            rate: '2.5%',
            amount: estimatedZakat
        },
        checklist: [
            { item: 'Financial Statements (Audited)', status: 'Pending Upload' },
            { item: 'Commercial Registration (Active)', status: 'Verified' },
            { item: 'VAT Returns (Yearly)', status: 'Available' }
        ]
    };
  },

  // --- AUDIT LOGGING ---

  async logAction(
    userId: string, 
    userName: string, 
    action: string, 
    entityType: string, 
    entityId: string, 
    details: any
  ) {
    const detailsStr = JSON.stringify(details);
    const hashInput = `${userId}:${action}:${entityId}:${new Date().toISOString()}:${detailsStr}`;
    const hash = btoa(hashInput); // Simple hash for demo

    await supabase.from(TBL_AUDIT).insert({
        userId,
        userName,
        action,
        entityType,
        entityId,
        details: detailsStr,
        timestamp: new Date().toISOString(),
        hash
    });
  },

  async getAuditLogs(entityId?: string) {
      let query = supabase.from(TBL_AUDIT).select('*').order('timestamp', { ascending: false });
      if(entityId) {
          query = query.eq('entityId', entityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
  },

  // --- GOVERNANCE CHECKS ---

  async checkZatcaCompliance(invoice: TaxInvoice): Promise<string[]> {
      const issues: string[] = [];
      
      if (!invoice.seller.vatNumber) issues.push("Seller VAT Number Missing");
      if (!invoice.issueDate) issues.push("Issue Date/Time Missing");
      if (invoice.type === InvoiceType.STANDARD) {
          if (!invoice.buyer.vatNumber) issues.push("Buyer VAT Number Required for Standard Invoice");
          if (!invoice.buyer.name) issues.push("Buyer Name Required");
      }
      
      const calcVat = invoice.subtotal * 0.15;
      if (Math.abs(calcVat - invoice.vatAmount) > 0.1) {
          issues.push("VAT Calculation Mismatch (Expected 15%)");
      }

      if (invoice.type === InvoiceType.SIMPLIFIED && !invoice.qrCodeData && !invoice.zatca?.qrCode) {
          issues.push("QR Code Missing for Simplified Invoice");
      }

      return issues;
  }
};
