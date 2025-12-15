
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Disbursement } from '../types';
import { Plus, Search, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';

const Disbursements: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const d = await dataService.getDisbursements();
    setDisbursements(d.items);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
       <PageHeader 
            title={t('disbursements.title')} 
            subtitle={t('disbursements.subtitle')}
            actions={
                <Button onClick={() => navigate('/disbursements/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none text-white">
                    <Plus size={18} className="mr-2" /> {t('btn.newExpense')}
                </Button>
            }
       />

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 border-b border-slate-100 flex gap-4">
               <div className="relative flex-1">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={18} />
                    <input className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-slate-200 rounded-lg focus:ring-[#D4A373] focus:border-[#D4A373]`} placeholder={t('search.placeholder')} />
               </div>
           </div>
           
           <table className="w-full text-left text-sm">
               <thead className="bg-[#F8F2EC] text-slate-700 font-bold">
                   <tr>
                       <th className="p-4">{t('col.date')}</th>
                       <th className="p-4">{t('col.category')} / {t('lbl.description')}</th>
                       <th className="p-4">{t('col.relatedTo')}</th>
                       <th className="p-4">{t('col.method')}</th>
                       <th className="p-4 text-right">{t('col.amount')}</th>
                       <th className="p-4 text-center">{t('status')}</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                   {disbursements.map(d => (
                       <tr key={d.id} className="hover:bg-slate-50">
                           <td className="p-4 text-slate-500">{d.date}</td>
                           <td className="p-4">
                               <div className="font-bold text-slate-800">{d.category}</div>
                               <div className="text-xs text-slate-500">{d.description}</div>
                           </td>
                           <td className="p-4 text-xs">
                               {d.supplierName && <div className="flex items-center gap-1"><FileText size={12}/> {d.supplierName}</div>}
                               {d.contractTitle && <div className="flex items-center gap-1 text-teal-600"><FileText size={12}/> {d.contractTitle}</div>}
                               {d.projectName && <div className="flex items-center gap-1 text-indigo-600"><FileText size={12}/> {d.projectName}</div>}
                           </td>
                           <td className="p-4 text-slate-500">{d.paymentMethod}</td>
                           <td className="p-4 text-right font-bold text-slate-800">{d.amount.toLocaleString()}</td>
                           <td className="p-4 text-center">
                               <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
                                   d.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                   d.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                   'bg-amber-50 text-amber-700 border-amber-200'
                               }`}>
                                   {d.approvalStatus === 'APPROVED' ? <CheckCircle size={12}/> : 
                                    d.approvalStatus === 'REJECTED' ? <XCircle size={12}/> : <Clock size={12}/>}
                                   {d.approvalStatus}
                               </span>
                           </td>
                       </tr>
                   ))}
                   {disbursements.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400">{t('production.noProjects')} (No records)</td></tr>
                   )}
               </tbody>
           </table>
       </div>
    </div>
  );
};

export default Disbursements;
