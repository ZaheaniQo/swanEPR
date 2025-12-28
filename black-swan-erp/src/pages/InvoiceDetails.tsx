
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoices } from '../domain/hooks/useInvoices';
import { TaxInvoice, InvoiceStatus, Role } from '../shared/types';
import { useApp, useTranslation } from '../AppContext';
import { CheckCircle, Lock, Send, ShieldCheck, Printer, ArrowLeft, History } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, currentUserRole } = useApp();
  const { t } = useTranslation();
  const { getInvoice, approveInvoice: approveInvoiceMutation, postInvoice: postInvoiceMutation } = useInvoices();
  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    const inv = await getInvoice(id);
    setInvoice(inv);
    setLoading(false);
  }, [getInvoice, id]);

  useEffect(() => {
    if (id) loadInvoice();
  }, [id, loadInvoice]);

  const handleApprove = async () => {
    if (!invoice || !id) return;
    try {
      await approveInvoiceMutation(id);
      showToast(t('msg.saved'), 'success');
      loadInvoice();
    } catch (e: any) {
      showToast(e.message || t('invoice.error.approvalFailed'), 'error');
    }
  };

  const handlePost = async () => {
    if (!invoice || !id) return;
    try {
      await postInvoiceMutation(id);
      showToast(t('msg.saved'), 'success');
      loadInvoice();
    } catch (e: any) {
      showToast(e.message || t('invoice.error.postFailed'), 'error');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div></div>;
  if (!invoice) return <div className="p-10 text-center">{t('noData')}</div>;

  const isDraft = invoice.status === InvoiceStatus.DRAFT;
  const isApproved = invoice.status === InvoiceStatus.APPROVED;
  const isPosted = invoice.status === InvoiceStatus.POSTED;
  const canApprove = (currentUserRole === Role.ACCOUNTING || currentUserRole === Role.CEO);
  const statusLabel = (() => {
    switch (invoice.status) {
      case InvoiceStatus.DRAFT:
        return t('invoices.status.draft');
      case InvoiceStatus.APPROVED:
        return t('invoices.status.approved');
      case InvoiceStatus.POSTED:
        return t('invoices.status.posted');
      default:
        return invoice.status;
    }
  })();
  const issueDate = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : t('common.na');
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : t('common.na');
  const buyerName = (invoice.buyer as any).name || (invoice.buyer as any).legalName || t('common.unknown');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader 
        title={invoice.invoiceNumber}
        subtitle={t('invoices.details')}
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase">{t('invoice.header.customer')}</p>
              <p className="text-2xl font-bold text-text">{buyerName}</p>
              <p className="text-sm text-text-muted font-mono">{(invoice.buyer as any).vatNumber || t('common.na')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{t('invoice.status.label')}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isPosted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  isApproved ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                  'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {statusLabel}
                </span>
              </div>
              <div className="text-text-muted">
                <span className="text-xs uppercase">{t('invoice.label.issueDate')}</span>
                <span className="ml-2 font-mono text-text">{issueDate}</span>
              </div>
              <div className="text-text-muted">
                <span className="text-xs uppercase">{t('invoice.label.dueDate')}</span>
                <span className="ml-2 font-mono text-text">{dueDate}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-xs font-semibold uppercase text-text-muted">{t('invoice.section.info')}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <p className="text-text-muted">{t('invoice.label.type')}</p>
              <p className="font-semibold text-text">{invoice.type}</p>
            </div>
            <div className="space-y-2">
              <p className="text-text-muted">{t('invoice.label.issueDate')}</p>
              <p className="font-mono text-text">{issueDate}</p>
            </div>
            <div className="space-y-2">
              <p className="text-text-muted">{t('invoice.label.currency')}</p>
              <p className="font-semibold text-text">{invoice.currency}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm pt-2 border-t border-border">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-text-muted">{t('invoice.section.customer')}</p>
              <p className="font-semibold text-text">{buyerName}</p>
              <p className="text-text-muted font-mono">{(invoice.buyer as any).vatNumber || t('common.na')}</p>
              <p className="text-text-muted">{(invoice.buyer as any).address || t('common.na')}</p>
            </div>
            <div className="space-y-2 md:col-span-2 md:text-right">
              <p className="text-xs font-semibold uppercase text-text-muted">{t('invoice.seller')}</p>
              <p className="font-semibold text-text">{invoice.seller.legalName}</p>
              <p className="text-text-muted font-mono">{invoice.seller.vatNumber}</p>
              <p className="text-text-muted">{invoice.seller.address || t('common.na')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/10">
              <h3 className="text-sm font-semibold text-text">{t('invoice.section.items')}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                    <tr>
                      <th className="p-4">{t('quotations.item')}</th>
                      <th className="p-4 text-center">{t('col.quantity')}</th>
                      <th className="p-4 text-right">{t('quotations.unitPrice')}</th>
                      <th className="p-4 text-right">{t('invoice.net')}</th>
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
                  <tfoot className="bg-secondary/5 border-t border-border">
                    <tr>
                      <td className="p-4 text-right font-semibold" colSpan={5}>{t('quotations.total')}</td>
                      <td className="p-4 text-right font-bold">{invoice.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
            </div>

            <div className="p-6 bg-secondary/5 border-t border-border flex justify-end">
              <div className="w-72 space-y-2 text-right text-sm">
                <div className="text-xs font-semibold uppercase text-text-muted">{t('invoice.section.totals')}</div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {invoice.zatca && (
              <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                  <h4 className="font-bold text-text mb-2 flex items-center gap-2"><ShieldCheck size={16}/> {t('invoice.zatcaCompliance')}</h4>
                  <div className="space-y-1 font-mono text-xs text-text-muted break-all">
                      <p>{t('invoice.zatca.uuid')}: {invoice.zatca.uuid}</p>
                      <p>{t('invoice.zatca.hash')}: {invoice.zatca.invoiceHash.substring(0, 20)}...</p>
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

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={16} className="mr-2"/> {t('invoice.action.back')}
          </Button>
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
    </div>
  );
};

export default InvoiceDetails;
