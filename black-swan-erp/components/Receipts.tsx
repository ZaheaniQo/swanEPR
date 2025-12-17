
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Receipt, Contract, PaymentStatus } from '../types';
import { Plus, CheckCircle, FileText, Search } from 'lucide-react';

const Receipts: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [viewState, setViewState] = useState<'LIST' | 'CREATE'>('LIST');

  // Form
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
      amount: 0,
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const r = await dataService.getReceipts();
    setReceipts(r);
    const c = await dataService.getContracts();
        setContracts((c as any).items ?? c);
  };

  const handleContractSelect = (contractId: string) => {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
          setNewReceipt({
              ...newReceipt,
              contractId: contract.id,
              contractTitle: contract.title,
              customerName: contract.clientName
          });
      }
  };

  const handleSave = async () => {
      if (!newReceipt.contractId || !newReceipt.amount) {
          showToast('Select contract and enter amount', 'error');
          return;
      }
      const receipt: Receipt = {
          ...newReceipt as Receipt,
          id: Math.random().toString(36).substr(2, 9),
          receiptNumber: `RCPT-${Date.now().toString().substr(-6)}`,
      };
      await dataService.addReceipt(receipt);
      showToast(t('msg.receiptCreated'), 'success');
      setViewState('LIST');
      loadData();
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('receipts.title')}</h1>
                <p className="text-slate-500">Track incoming payments and issue receipts.</p>
            </div>
            {viewState === 'LIST' && (
                <button onClick={() => setViewState('CREATE')} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> {t('btn.create')}
                </button>
            )}
        </div>

        {viewState === 'LIST' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                            <th className="p-4">Receipt #</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Contract</th>
                            <th className="p-4">Method</th>
                            <th className="p-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {receipts.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className="p-4 font-mono text-slate-600">{r.receiptNumber}</td>
                                <td className="p-4 text-slate-500">{r.date}</td>
                                <td className="p-4 font-medium">{r.customerName}</td>
                                <td className="p-4 text-xs text-slate-500">{r.contractTitle}</td>
                                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{r.paymentMethod}</span></td>
                                <td className="p-4 text-right font-bold text-emerald-600">{r.amount.toLocaleString()} SAR</td>
                            </tr>
                        ))}
                         {receipts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No receipts found.</td></tr>}
                    </tbody>
                </table>
            </div>
        )}

        {viewState === 'CREATE' && (
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
                <h2 className="text-xl font-bold mb-6">Issue New Receipt</h2>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Select Contract</label>
                        <select 
                            className="w-full border-slate-300 rounded-lg" 
                            onChange={e => handleContractSelect(e.target.value)}
                            value={newReceipt.contractId || ''}
                        >
                            <option value="">-- Choose Contract --</option>
                            {contracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber} - {c.clientName} ({c.title})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">SAR</span>
                                <input 
                                    type="number" 
                                    className="w-full border-slate-300 rounded-lg pl-12" 
                                    value={newReceipt.amount}
                                    onChange={e => setNewReceipt({...newReceipt, amount: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <input 
                                type="date" 
                                className="w-full border-slate-300 rounded-lg"
                                value={newReceipt.date}
                                onChange={e => setNewReceipt({...newReceipt, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Payment Method</label>
                            <select 
                                className="w-full border-slate-300 rounded-lg"
                                value={newReceipt.paymentMethod}
                                onChange={e => setNewReceipt({...newReceipt, paymentMethod: e.target.value as any})}
                            >
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="Check">Check</option>
                                <option value="POS">POS / Mada</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Reference / Check #</label>
                            <input 
                                type="text" 
                                className="w-full border-slate-300 rounded-lg"
                                placeholder="Optional"
                                value={newReceipt.referenceNumber || ''}
                                onChange={e => setNewReceipt({...newReceipt, referenceNumber: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
                        <textarea 
                            className="w-full border-slate-300 rounded-lg"
                            rows={3}
                            value={newReceipt.notes || ''}
                            onChange={e => setNewReceipt({...newReceipt, notes: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="pt-6 border-t flex justify-end gap-3">
                        <button onClick={() => setViewState('LIST')} className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn-primary">Save Receipt</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Receipts;
