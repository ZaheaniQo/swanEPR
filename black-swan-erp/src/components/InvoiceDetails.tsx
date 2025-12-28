
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { TaxInvoice, InvoiceStatus, Role } from '../types';
import { useApp, useTranslation } from '../AppContext';
import { CheckCircle, Lock, Send, ShieldCheck, Printer, ArrowLeft, History } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, currentUserRole } = useApp();
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    if (!id) return;
    const inv = await dataService.getTaxInvoiceById(id);
    setInvoice(inv);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!invoice || !id) return;
    try {
      await dataService.approveInvoice(id);
      showToast(t('msg.saved'), 'success');
      loadInvoice();
    } catch (e: any) {
      showToast(e.message || 'Approval Failed', 'error');
    }
  };

  const handlePost = async () => {
    if (!invoice || !id) return;
    try {
      await dataService.postInvoice(id);
      showToast(t('msg.saved'), 'success');
      loadInvoice();
    } catch (e: any) {
      showToast(e.message || 'Posting Failed', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div></div>;
  if (!invoice) return <div className="p-10 text-center">{t('noData')}</div>;

  const isDraft = invoice.status === InvoiceStatus.DRAFT;
  const isApproved = invoice.status === InvoiceStatus.APPROVED;
  const isPosted = invoice.status === InvoiceStatus.POSTED;
  const canApprove = (currentUserRole === Role.ACCOUNTING || currentUserRole === Role.CEO);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader 
        title={invoice.invoiceNumber}
        subtitle={t('invoices.details')}
        actions={
            <Button variant="ghost" onClick={() => navigate('/invoices')}>
                <ArrowLeft size={16} className="mr-2"/> {t('back')}
            </Button>
        }
      />

      {/* Lockdown Banner */}
      {!isDraft && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${isPosted ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
              {isPosted ? <Lock size={20} /> : <ShieldCheck size={20} />}
              <div>
                  <h3 className="font-bold text-sm">
                      {isPosted ? t('invoice.lockedBanner') : t('invoice.approvedBanner')}
                  </h3>
                  <p className="text-xs opacity-90">
                      {isPosted 
                        ? t('invoice.lockedText') 
                        : t('invoice.approvedText')}
                  </p>
              </div>
          </div>
      )}

      {/* Action Bar */}
      <Card>
          <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isPosted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      isApproved ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                      'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                      {invoice.status}
                  </span>
                  <span className="text-sm text-text-muted font-mono">{invoice.issueDate.split('T')[0]}</span>
              </div>

              <div className="flex gap-2">
                  {isDraft && canApprove && (
                    <Button onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <CheckCircle size={16} className="mr-2" /> {t('btn.approve')}
                    </Button>
                  )}
                  {isApproved && canApprove && (
                    <Button onClick={handlePost} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Send size={16} className="mr-2" /> {t('btn.postToLedger')}
                    </Button>
                  )}
                  {!isDraft && (
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer size={16} className="mr-2" /> {t('btn.print')}
                    </Button>
                  )}
              </div>
          </CardContent>
      </Card>

      {/* Invoice Body */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
            <div className="p-8 border-b border-border flex justify-between bg-secondary/10">
               <div>
                 <p className="text-xs font-bold text-text-muted uppercase mb-1">{t('invoice.billedTo')}</p>
                 <p className="text-lg font-bold text-text">{(invoice.buyer as any).name || (invoice.buyer as any).legalName}</p>
                 <p className="text-text-muted text-sm font-mono">{(invoice.buyer as any).vatNumber}</p>
                 <p className="text-text-muted text-sm mt-1 max-w-xs">{(invoice.buyer as any).address}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs font-bold text-text-muted uppercase mb-1">{t('invoice.seller')}</p>
                 <p className="font-bold text-text">{invoice.seller.legalName}</p>
                 <p className="text-text-muted text-sm font-mono">{invoice.seller.vatNumber}</p>
               </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                    <tr>
                      <th className="p-4">{t('quotations.item')}</th>
                      <th className="p-4 text-center">{t('col.quantity')}</th>
                      <th className="p-4 text-right">{t('quotations.unitPrice')}</th>
                      <th className="p-4 text-right">Net</th>
                      <th className="p-4 text-right">{t('quotations.vat')}</th>
                      <th className="p-4 text-right">{t('quotations.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-4">{item.description}</td>
                        <td className="p-4 text-center">{item.quantity}</td>
                        <td className="p-4 text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="p-4 text-right">{item.netAmount.toFixed(2)}</td>
                        <td className="p-4 text-right">{item.vatAmount.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold">{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            <div className="p-8 bg-secondary/5 border-t border-border flex justify-end">
               <div className="w-64 space-y-2 text-right text-sm">
                 <div className="flex justify-between text-text-muted"><span>{t('invoice.subtotal')}</span> <span>{invoice.subtotal.toFixed(2)}</span></div>
                 <div className="flex justify-between text-text-muted"><span>{t('invoice.vat')}</span> <span>{invoice.vatAmount.toFixed(2)}</span></div>
                 <div className="flex justify-between font-bold text-xl text-text pt-2 border-t border-border">
                   <span>{t('invoice.totalAmount')}</span> 
                   <span>{invoice.totalAmount.toFixed(2)} {invoice.currency}</span>
                 </div>
               </div>
            </div>
        </CardContent>
      </Card>

      {/* Metadata & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {invoice.zatca && (
              <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-text mb-2 flex items-center gap-2"><ShieldCheck size={16}/> {t('invoice.zatcaCompliance')}</h4>
                  <div className="space-y-1 font-mono text-xs text-text-muted break-all">
                      <p>UUID: {invoice.zatca.uuid}</p>
                      <p>Hash: {invoice.zatca.invoiceHash.substring(0, 20)}...</p>
                  </div>
              </div>
          )}
          {isPosted && invoice.posting && (
              <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-text mb-2 flex items-center gap-2"><History size={16}/> {t('invoice.postingTrail')}</h4>
                  <div className="space-y-1 text-xs text-text-muted">
                      <p>{t('invoice.journalEntry')}: <span className="font-mono">{invoice.posting.journalEntryId}</span></p>
                      <p>{t('invoice.postedAt')}: {new Date(invoice.posting.postedAt).toLocaleString()}</p>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default InvoiceDetails;