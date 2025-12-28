
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Quotation, QuotationStatus } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Plus, ArrowRightCircle, FileText, Search } from 'lucide-react';

const Quotations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useApp();
  const statusLabel = (status: QuotationStatus) => {
      switch (status) {
          case 'PENDING':
              return t('quotations.status.pending');
          case 'APPROVED':
              return t('quotations.status.approved');
          case 'REJECTED':
              return t('quotations.status.rejected');
          case 'CONVERTED':
              return t('quotations.status.converted');
          default:
              return status;
      }
  };

  useEffect(() => {
        loadQuotations();
  }, []);

    const loadQuotations = async () => {
        setLoading(true);
        try {
            const data = await dataService.getQuotations();
            setQuotations(data);
        } catch (err: any) {
            showToast(err.message || t('msg.errorLoading'), 'error');
        } finally {
            setLoading(false);
        }
    };

  const filtered = quotations.filter(q => 
            q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('quotations.title')} 
        actions={
            <Button onClick={() => navigate('/quotations/new')}>
                <Plus size={18} className="mr-2"/> {t('btn.create')}
            </Button>
        }
      />

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-text-muted" size={18} />
              <input 
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={t('search.quotations')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                  <tr>
                      <th className="p-4">{t('col.quotationNo')}</th>
                      <th className="p-4">{t('col.date')}</th>
                      <th className="p-4">{t('col.customer')}</th>
                      <th className="p-4 text-right">{t('col.total')}</th>
                      <th className="p-4 text-center">{t('col.status')}</th>
                      <th className="p-4 text-center">{t('col.actionsColumn')}</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-border">
                  {filtered.map(q => (
                      <tr key={q.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                          <td className="p-4 font-mono font-medium">{q.quotationNumber}</td>
                          <td className="p-4 text-text-muted">{q.date || t('common.na')}</td>
                          <td className="p-4 font-medium">{q.customerCompany || q.customerName || t('common.na')}</td>
                          <td className="p-4 text-right font-bold">{q.totalAmount.toLocaleString()}</td>
                          <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  q.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800' :
                                  q.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                  q.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                              }`}>
                                  {statusLabel(q.status)}
                              </span>
                          </td>
                          <td className="p-4 text-center">
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }}>
                                  <FileText size={16}/>
                              </Button>
                          </td>
                      </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                      <tr>
                          <td className="p-8 text-center text-text-muted" colSpan={6}>
                              <div className="space-y-3">
                                  <div>{t('quotations.empty')}</div>
                                  <Button onClick={() => navigate('/quotations/new')}>
                                      <Plus size={16} className="mr-2"/> {t('btn.create')}
                                  </Button>
                              </div>
                          </td>
                      </tr>
                  )}
                  {loading && (
                      <tr>
                          <td className="p-8 text-center text-text-muted" colSpan={6}>{t('loading')}</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      <div className="md:hidden space-y-4">
          {filtered.map(q => (
              <Card key={q.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="font-bold text-text">{q.quotationNumber}</h3>
                              <p className="text-sm text-text-muted">{q.customerCompany || q.customerName || t('common.na')}</p>
                          </div>
                          <Badge variant={q.status === 'CONVERTED' ? 'success' : 'warning'}>{statusLabel(q.status)}</Badge>
                      </div>
                      
                      <div className="flex justify-between items-end">
                          <p className="text-2xl font-bold text-text">{q.totalAmount.toLocaleString()} <span className="text-xs font-normal">{t('currency')}</span></p>
                          <span className="text-xs text-text-muted">{q.date || t('common.na')}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-between">
                          <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }}>{t('btn.view')}</Button>
                          {q.status === 'PENDING' && (
                              <span className="text-xs text-primary flex items-center font-bold">{statusLabel('PENDING')} <ArrowRightCircle size={14} className="ml-1"/></span>
                          )}
                      </div>
                  </CardContent>
              </Card>
          ))}
          {filtered.length === 0 && !loading && (
              <div className="p-10 text-center text-text-muted">
                  <div className="space-y-3">
                      <div>{t('quotations.empty')}</div>
                      <Button onClick={() => navigate('/quotations/new')}>
                          <Plus size={16} className="mr-2"/> {t('btn.create')}
                      </Button>
                  </div>
              </div>
          )}
          {loading && (
              <div className="p-10 text-center text-text-muted">{t('loading')}</div>
          )}
      </div>
    </div>
  );
};

export default Quotations;
