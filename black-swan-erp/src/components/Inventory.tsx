
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { erpService } from '../services/supabase/erp.service';
import { InventoryItem } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ArrowLeftRight, Layers, Shirt, Search } from 'lucide-react';

const Inventory: React.FC = () => {
    const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<'All' | 'Material' | 'Product'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    erpService.getInventoryStock().then(stock => {
        const mappedItems: InventoryItem[] = stock.map((s: any) => ({
            id: s.id,
            code: s.productCode || '',
            name: s.productName || '',
            type: (s.type === 'MATERIAL' || s.type === 'Material') ? 'Material' : 'Product',
            quantity: s.quantity,
            unit: s.unit || 'PCS',
            reorderLevel: s.reorderLevel,
            cost: s.cost || 0
        }));
        setItems(mappedItems);
    });
  }, []);

  const filteredItems = items.filter(i => {
      const matchType = filterType === 'All' ? true : i.type === filterType;
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('inventory.title')} 
        subtitle={t('inventory.subtitle')}
        actions={
            <Button onClick={() => navigate('/inventory/transaction')}>
                <ArrowLeftRight size={18} className="mr-2" /> {t('btn.recordMovement')}
            </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1">
                            <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-text-muted`} size={18} />
                            <input 
                                className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background`} 
                                placeholder={t('search.inventory')} 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
          </div>
          <div className="flex gap-2">
              {['All', 'Material', 'Product'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-text-muted hover:text-text'}`}
                  >
                      {t(`filter.${type.toLowerCase()}`)}
                  </button>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                          <div className={`p-2 rounded-lg ${item.type === 'Material' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {item.type === 'Material' ? <Layers size={20} /> : <Shirt size={20} />}
                          </div>
                          <Badge variant={item.quantity <= item.reorderLevel ? 'danger' : 'success'}>
                              {item.quantity <= item.reorderLevel ? t('inventory.lowStock') : t('inventory.inStock')}
                          </Badge>
                      </div>
                      <h3 className="font-bold text-lg text-text mb-1">{item.name}</h3>
                      <p className="text-xs font-mono text-text-muted mb-4">{t('col.code')}: {item.code}</p>
                      
                      <div className="flex justify-between items-end border-t border-border pt-4">
                          <div>
                              <p className="text-xs text-text-muted uppercase tracking-wider">{t('inventory.onHand')}</p>
                              <p className="font-bold text-2xl text-text">{item.quantity} <span className="text-sm font-normal text-text-muted">{item.unit}</span></p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-text-muted">{t('inventory.unitValuation')}</p>
                              <p className="font-bold text-text">{item.cost.toFixed(2)}</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
          {filteredItems.length === 0 && (
              <div className="col-span-full p-10 text-center text-text-muted border border-dashed border-border rounded-xl">
                  {t('noData')}
              </div>
          )}
      </div>
    </div>
  );
};

export default Inventory;
