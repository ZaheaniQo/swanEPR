
import { supabase, getTenantIdFromSession } from '../supabaseClient';
import { TaxInvoice, InvoiceType, AuditLog, AccountType } from "../../types";
import { accountingService } from "./accounting.service";

const TBL_AUDIT = 'audit_logs';
const TBL_INVOICES = 'invoices';

const getContext = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Unauthorized');
  const tenantId = await getTenantIdFromSession();
  return { tenantId };
};

export const complianceService = {

  // --- VAT REPORTING ---
  
  async getVATReport(startDate: string, endDate: string) {
    const { tenantId } = await getContext();

    const { data: invoices, error } = await supabase
      .from(TBL_INVOICES)
      .select('id, type, status, subtotal, vat_amount, issue_date, total_amount')
      .eq('tenant_id', tenantId)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate)
      .in('status', ['POSTED', 'SENT_TO_ZATCA', 'PAID']);

    if (error) throw error;

    const safeInvoices = invoices || [];
    const standardInvoices = safeInvoices.filter((i: any) => i.type === InvoiceType.STANDARD);
    const simplifiedInvoices = safeInvoices.filter((i: any) => i.type === InvoiceType.SIMPLIFIED);

    const outputVat = safeInvoices.reduce((sum: number, inv: any) => sum + (inv.vat_amount || inv.vatAmount || 0), 0);
    const totalSales = safeInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

    const ledger = await accountingService.getJournalEntries();
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
        totalPurchases: inputVat * 6.67,
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
    const { tenantId } = await getContext();
    const payload = {
      table_name: entityType,
      record_id: entityId,
      operation: action,
      new_data: { ...details, userName },
      changed_by: userId,
      changed_at: new Date().toISOString(),
      tenant_id: tenantId
    } as const;

    const { error } = await supabase.from(TBL_AUDIT).insert(payload);
    if (error) throw error;
  },

  async getAuditLogs(entityId?: string) {
      const { tenantId } = await getContext();
      let query = supabase
        .from(TBL_AUDIT)
        .select('id, table_name, record_id, operation, changed_by, changed_at, new_data, old_data')
        .order('changed_at', { ascending: false });

      if (entityId) {
        query = query.eq('record_id', entityId);
      }
      query = query.eq('tenant_id', tenantId);
      
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        action: row.operation,
        entityType: row.table_name,
        entityId: row.record_id,
        userId: row.changed_by,
        userName: row.new_data?.userName || row.changed_by,
        timestamp: row.changed_at,
        details: JSON.stringify(row.new_data || row.old_data || {}),
        hash: ''
      })) as AuditLog[];
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
