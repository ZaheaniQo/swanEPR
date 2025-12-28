import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { useInvoices } from '../domain/hooks/useInvoices';
import { TaxInvoice, InvoiceStatus, Role } from '../shared/types';
import { RefreshCw, ChevronDown, Lock, Eye, Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const formatCurrency = (amount: number, currency: string = 'SAR') => {
  if (isNaN(amount) || amount === null) return '0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const Invoices: React.FC = () => {
  const { currentUserRole, showToast } = useApp();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
    const getBuyerName = useCallback((buyer: any): string => {
        return buyer?.legalName ?? buyer?.name ?? t('common.na');
    }, [t]);
  
  const canManage = [Role.CEO, Role.ACCOUNTING].includes(currentUserRole);
    const { invoices, hasMore, loading, loadInvoices } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const refresh = useCallback(async () => {
        try {
            await loadInvoices({ reset: true });
        } catch (error) {
            console.error(error);
            showToast(t('msg.errorLoading'), 'error');
        }
    }, [loadInvoices, showToast, t]);

    const loadMore = useCallback(async () => loadInvoices({ reset: false }), [loadInvoices]);

    useEffect(() => {
        refresh();
    }, [refresh]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      getBuyerName(inv.buyer).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

    const statusLabel = (status: InvoiceStatus | 'SENT_TO_ZATCA' | 'ALL') => {
        switch (status) {
            case InvoiceStatus.DRAFT:
                return t('invoices.status.draft');
            case InvoiceStatus.APPROVED:
                return t('invoices.status.approved');
            case InvoiceStatus.POSTED:
                return t('invoices.status.posted');
            case 'SENT_TO_ZATCA':
                return t('invoices.status.reported');
            default:
                return t('filter.all');
        }
    };

  return (
    <div className="space-y-6">
        <PageHeader 
            title={t('invoices.title')} 
            subtitle={t('invoices.subtitle')}
            actions={
                canManage && (
                    <Button onClick={() => navigate('/invoices/new')}>
                        <Plus size={18} className="mr-2" /> {t('btn.create')}
                    </Button>
                )
            }
        />

        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-text-muted`} size={18} />
                <input 
                    className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary`}
                    placeholder={t('search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <select 
                    className="flex-1 md:w-auto py-2 px-4 border border-input rounded-lg bg-surface text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">{t('filter.all')}</option>
                    <option value={InvoiceStatus.DRAFT}>{statusLabel(InvoiceStatus.DRAFT)}</option>
                    <option value={InvoiceStatus.APPROVED}>{statusLabel(InvoiceStatus.APPROVED)}</option>
                    <option value={InvoiceStatus.POSTED}>{statusLabel(InvoiceStatus.POSTED)}</option>
                    <option value="SENT_TO_ZATCA">{statusLabel('SENT_TO_ZATCA')}</option>
                </select>
                <Button variant="outline" onClick={refresh} title={t('btn.refresh')}>
                    <RefreshCw size={18} />
                </Button>
            </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                    <tr>
                        <th className="p-4">{t('col.invoiceNo')}</th>
                        <th className="p-4">{t('col.date')}</th>
                        <th className="p-4">{t('col.customer')}</th>
                        <th className="p-4 text-right">{t('col.total')}</th>
                        <th className="p-4 text-center">{t('col.status')}</th>
                        <th className="p-4 text-center">{t('col.actionsColumn')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                            <td className="p-4 font-mono font-medium">{inv.invoiceNumber}</td>
                            <td className="p-4 text-text-muted">{inv.issueDate ? inv.issueDate.split('T')[0] : t('common.na')}</td>
                            <td className="p-4 font-medium">{getBuyerName(inv.buyer)}</td>
                            <td className="p-4 text-right font-bold">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                            <td className="p-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    inv.status === InvoiceStatus.POSTED ? 'bg-emerald-100 text-emerald-800' : 
                                    inv.status === InvoiceStatus.APPROVED ? 'bg-blue-100 text-blue-800' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {inv.status === InvoiceStatus.POSTED && <Lock size={12}/>}
                                    {statusLabel(inv.status)}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}>
                                    <Eye size={16}/>
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <tr>
                            <td className="p-8 text-center text-text-muted" colSpan={6}>
                                <div className="space-y-3">
                                    <div>{t('noData')}</div>
                                    {canManage && (
                                        <Button onClick={() => navigate('/invoices/new')}>
                                            <Plus size={16} className="mr-2" /> {t('btn.create')}
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
            {filteredInvoices.map(inv => (
                <Card key={inv.id} className="p-4" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="font-mono font-bold text-primary">{inv.invoiceNumber}</p>
                            <p className="text-xs text-text-muted">{inv.issueDate ? inv.issueDate.split('T')[0] : t('common.na')}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            inv.status === InvoiceStatus.POSTED ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                            {statusLabel(inv.status)}
                        </span>
                    </div>
                    <div className="mb-3">
                        <p className="font-medium text-text">{getBuyerName(inv.buyer)}</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-border pt-3">
                        <span className="font-bold text-lg">{formatCurrency(inv.totalAmount, inv.currency)}</span>
                        <Button size="sm" variant="outline">{t('btn.view')}</Button>
                    </div>
                </Card>
            ))}
            {filteredInvoices.length === 0 && (
                <div className="p-8 text-center text-text-muted">
                    <div className="space-y-3">
                        <div>{t('noData')}</div>
                        {canManage && (
                            <Button onClick={() => navigate('/invoices/new')}>
                                <Plus size={16} className="mr-2" /> {t('btn.create')}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {hasMore && (
            <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={loadMore} disabled={loading}>
                    {loading ? t('loading') : <><ChevronDown size={16} className="mr-2"/> {t('btn.next')}</>}
                </Button>
            </div>
        )}
    </div>
  );
};

export default Invoices;
