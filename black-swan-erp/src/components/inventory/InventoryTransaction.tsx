
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { erpService } from '../../services/supabase/erp.service';
import { InventoryItem, InventoryTransactionType, Warehouse } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { ArrowDownCircle, ArrowUpCircle, Save } from 'lucide-react';

const InventoryTransaction: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [type, setType] = useState<InventoryTransactionType>('IN');
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Load Warehouses
    erpService.getWarehouses().then(setWarehouses);
  }, []);

  useEffect(() => {
      const loadItems = async () => {
          if (!warehouseId) {
              setItems([]);
              return;
          }

          if (type === 'IN') {
              // For IN, show ALL products (even those not in stock)
              const products = await dataService.getProducts();
              setItems(products.map(p => ({
                  id: p.id, // Product ID
                  code: p.sku,
                  name: p.name,
                  type: 'Product',
                  quantity: 0, // Unknown or irrelevant for new stock
                  unit: p.baseUnit,
                  reorderLevel: 0,
                  cost: p.avgCost
              })));
          } else {
              // For OUT, show only items IN STOCK at this warehouse
              const stock = await erpService.getInventoryStock(warehouseId);
              setItems(stock.map((s: any) => ({
                  id: s.product_id, // Use Product ID for consistency
                  code: s.productCode || '',
                  name: s.productName || '',
                  type: 'Product',
                  quantity: s.quantity,
                  unit: s.unit || 'PCS',
                  reorderLevel: s.reorderLevel,
                  cost: s.cost || 0
              })));
          }
      };
      loadItems();
  }, [warehouseId, type]);

  const handleSubmit = async () => {
      if (!itemId || !warehouseId || quantity <= 0) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      try {
          // Use the robust method that handles finding/creating stock records
          await erpService.adjustStockByProduct(itemId, warehouseId, quantity, type, reason);
          showToast(t('msg.stockSuccess'), 'success');
          navigate('/inventory');
      } catch (error) {
          console.error(error);
          showToast('Transaction failed', 'error');
      }
  };

  const selectedItem = items.find(i => i.id === itemId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title={t('inventory.transactionTitle')} 
        subtitle={t('inventory.transactionSubtitle')}
        actions={<Button variant="ghost" onClick={() => navigate('/inventory')}>{t('btn.cancel')}</Button>}
      />

      <Card>
          <CardContent className="p-8 space-y-6">
              
              {/* Type Selection */}
              <div className="flex gap-4">
                  <button 
                    onClick={() => setType('IN')}
                    className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-border hover:bg-secondary'}`}
                  >
                      <ArrowDownCircle size={32} />
                      <span className="font-bold">{t('inventory.receive')}</span>
                  </button>
                  <button 
                    onClick={() => setType('OUT')}
                    className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'OUT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border hover:bg-secondary'}`}
                  >
                      <ArrowUpCircle size={32} />
                      <span className="font-bold">{t('inventory.issue')}</span>
                  </button>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse</label>
                      <select 
                          className="w-full p-2 border rounded-md"
                          value={warehouseId}
                          onChange={e => setWarehouseId(e.target.value)}
                      >
                          <option value="">-- Select Warehouse --</option>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                  </div>

                  <Select label={t('col.item')} value={itemId} onChange={e => setItemId(e.target.value)} disabled={!warehouseId}>
                      <option value="">-- Select Item --</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} (Cur: {i.quantity} {i.unit})</option>)}
                  </Select>

                  {selectedItem && (
                      <div className="p-3 bg-secondary rounded text-sm text-text-muted flex justify-between">
                          <span>{t('inventory.currentStock')}: {selectedItem.quantity}</span>
                          <span>{t('col.cost')}: {selectedItem.cost}</span>
                      </div>
                  )}

                  <Input 
                    label={t('col.quantity')} 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(Number(e.target.value))} 
                    placeholder="Enter amount"
                  />

                  <Textarea 
                    label={t('inventory.reason')} 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="PO Number, Order ID, or reason for adjustment"
                  />
              </div>

              <Button className="w-full" onClick={handleSubmit} variant={type === 'IN' ? 'primary' : 'danger'}>
                  <Save size={18} className="mr-2" /> {t('btn.submit')}
              </Button>
          </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTransaction;
