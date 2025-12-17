
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Quotation, QuotationStatus } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Plus, ArrowRightCircle, FileText, Search } from 'lucide-react';

const Quotations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useApp();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(q => (
              <Card key={q.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h3 className="font-bold text-text">{q.quotationNumber}</h3>
                              <p className="text-sm text-text-muted">{q.customerCompany || q.customerName}</p>
                          </div>
                          <Badge variant={q.status === 'CONVERTED' ? 'success' : 'warning'}>{q.status}</Badge>
                      </div>
                      
                      <div className="flex justify-between items-end">
                          <p className="text-2xl font-bold text-text">{q.totalAmount.toLocaleString()} <span className="text-xs font-normal">{t('currency')}</span></p>
                          <span className="text-xs text-text-muted">{q.date}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-between">
                          <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }}>{t('viewDetails')}</Button>
                          {q.status === 'PENDING' && (
                              <span className="text-xs text-primary flex items-center font-bold">Pending <ArrowRightCircle size={14} className="ml-1"/></span>
                          )}
                      </div>
                  </CardContent>
              </Card>
          ))}
          {filtered.length === 0 && !loading && (
              <div className="col-span-full p-10 text-center text-text-muted">{t('noData')}</div>
          )}
          {loading && (
              <div className="col-span-full p-10 text-center text-text-muted">{t('loading')}</div>
          )}
      </div>
    </div>
  );
};

export default Quotations;
