
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { InventoryItem, InventoryTransactionType } from '../types';
import { Package, AlertCircle, ArrowDownCircle, ArrowUpCircle, X, Save, Layers, Shirt } from 'lucide-react';

const Inventory: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<'All' | 'Material' | 'Product'>('All');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<InventoryTransactionType>('IN');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getInventory();
    setItems([...data]);
  };

  const handleTransaction = async () => {
      if (!selectedItem || quantity <= 0) {
          showToast(t('msg.fillRequired'), "error");
          return;
      }
      try {
          await dataService.updateInventory(selectedItem, quantity, modalType);
          showToast(t('msg.stockSuccess'), "success");
          setIsModalOpen(false);
          setQuantity(0);
          setSelectedItem('');
          loadData();
      } catch (error) {
          showToast("Insufficient stock", "error");
      }
  };

  const openModal = (type: InventoryTransactionType) => {
      setModalType(type);
      setQuantity(0);
      setIsModalOpen(true);
  };

  const filteredItems = items.filter(i => filterType === 'All' ? true : i.type === filterType);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('inventory.title')}</h1>
            <p className="text-slate-500">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => openModal('IN')} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 shadow-md transition-all">
                <ArrowDownCircle size={16} /> {t('btn.receive')}
            </button>
             <button onClick={() => openModal('OUT')} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 shadow-md transition-all">
                <ArrowUpCircle size={16} /> {t('btn.issue')}
            </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-slate-200 pb-1">
          {['All', 'Material', 'Product'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`pb-2 text-sm font-medium transition-colors ${filterType === type ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  {t(`filter.${type.toLowerCase()}`)}
              </button>
          ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                    <th className="px-6 py-4 font-semibold">{t('col.code')}</th>
                    <th className="px-6 py-4 font-semibold">{t('col.item')}</th>
                    <th className="px-6 py-4 font-semibold">{t('col.type')}</th>
                    <th className="px-6 py-4 font-semibold text-center">{t('col.stock')}</th>
                    <th className="px-6 py-4 font-semibold text-right">{t('col.cost')}</th>
                    <th className="px-6 py-4 font-semibold text-right">{t('status')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                         <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.id.toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                            <div className={`p-2 rounded ${item.type === 'Material' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {item.type === 'Material' ? <Layers size={16} /> : <Shirt size={16} />}
                            </div>
                            {item.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.type}</td>
                        <td className="px-6 py-4 text-center">
                            <span className="font-bold text-slate-800">{item.quantity}</span> <span className="text-xs text-slate-400">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right">{item.cost.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                            {item.quantity <= item.reorderLevel ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                    <AlertCircle size={12} /> Low
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    OK
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                  <div className={`p-5 border-b flex justify-between items-center ${modalType === 'IN' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <h3 className="font-bold text-lg text-slate-800">
                          {modalType === 'IN' ? t('modal.receiveStock') : t('modal.issueStock')}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.item')}</label>
                          <select className="w-full rounded-lg border-slate-300" value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                              <option value="">-- Choose Item --</option>
                              {items.map(i => <option key={i.id} value={i.id}>{i.name} (Cur: {i.quantity})</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.stock')}</label>
                          <input type="number" className="w-full rounded-lg border-slate-300" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                      </div>
                  </div>
                  <div className="p-5 border-t flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">{t('btn.cancel')}</button>
                      <button onClick={handleTransaction} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">{t('btn.submit')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;
