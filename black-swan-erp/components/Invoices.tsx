
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { TaxInvoice, InvoiceType } from '../types';
import { QrCode, FileText, CheckCircle, UploadCloud, RefreshCw } from 'lucide-react';

const Invoices: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await dataService.getTaxInvoices();
        setInvoices((data as any).items ?? data);
    setLoading(false);
  };

  const handleSubmitZatca = async (id: string) => {
      await dataService.submitToZatca(id);
      showToast('Invoice submitted to ZATCA', 'success');
      loadData();
  };

  if (loading) return <div className="p-10 text-center">Loading Invoices...</div>;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('invoices.title')}</h1>
                <p className="text-slate-500">Manage ZATCA-compliant electronic invoices.</p>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                        <th className="p-4">Invoice #</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center">ZATCA Status</th>
                        <th className="p-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                            <td className="p-4 text-slate-500">{inv.issueDate.split('T')[0]}</td>
                            <td className="p-4 font-medium">{(inv.buyer as any).name || (inv.buyer as any).legalName || 'N/A'}</td>
                            <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">{inv.type}</span></td>
                            <td className="p-4 text-right font-bold text-slate-800">{inv.totalAmount.toLocaleString()} SAR</td>
                            <td className="p-4 text-center">
                                {inv.status === 'SENT_TO_ZATCA' ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                        <CheckCircle size={12}/> Reported
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold border border-amber-100">
                                        <RefreshCw size={12}/> Pending
                                    </span>
                                )}
                            </td>
                            <td className="p-4 flex justify-center gap-2">
                                {inv.status !== 'SENT_TO_ZATCA' ? (
                                    <button 
                                        onClick={() => handleSubmitZatca(inv.id)}
                                        className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-1"
                                    >
                                        <UploadCloud size={12} /> Submit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button className="text-slate-400 hover:text-slate-600" title="Download XML"><FileText size={18}/></button>
                                        <button className="text-slate-400 hover:text-slate-600" title="View QR"><QrCode size={18}/></button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400">No invoices generated yet.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Invoices;
