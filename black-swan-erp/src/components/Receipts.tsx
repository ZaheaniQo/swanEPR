
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Receipt } from '../types';
import { Plus } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';

const Receipts: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const r = await dataService.getReceipts();
    setReceipts(r);
  };

  return (
    <div className="space-y-6">
        <PageHeader 
            title={t('receipts.title')} 
            subtitle={t('receipts.subtitle')}
            actions={
                <Button onClick={() => navigate('/receipts/new')}>
                    <Plus size={18} className="mr-2" /> {t('btn.create')}
                </Button>
            }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                        <th className="p-4">Receipt #</th>
                        <th className="p-4">{t('col.date')}</th>
                        <th className="p-4">{t('col.customer')}</th>
                        <th className="p-4">{t('col.contractNo')}</th>
                        <th className="p-4">{t('col.method')}</th>
                        <th className="p-4 text-right">{t('col.amount')}</th>
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
                            <td className="p-4 text-right font-bold text-emerald-600">{r.amount.toLocaleString()} {t('currency')}</td>
                        </tr>
                    ))}
                        {receipts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t('noData')}</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Receipts;
