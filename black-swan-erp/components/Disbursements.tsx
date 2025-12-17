
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Disbursement, Supplier, Contract, Project, Role } from '../types';
import { Plus, Filter, Search, DollarSign, Calendar, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

const Disbursements: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewState, setViewState] = useState<'LIST' | 'CREATE'>('LIST');
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Disbursement>>({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      paymentMethod: 'Bank Transfer',
      description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const d = await dataService.getDisbursements();
        setDisbursements((d as any).items ?? d);
    
    // Load related entities for dropdowns
    const s = await dataService.getSuppliers();
    const c = await dataService.getContracts();
    const p = await dataService.getProjects();
    setSuppliers(s);
        setContracts((c as any).items ?? c);
    setProjects(p);
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.amount || !formData.description) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }
    
    try {
        await dataService.addDisbursement(formData);
        showToast(t('msg.saved'), 'success');
        setViewState('LIST');
        setFormData({
            date: new Date().toISOString().split('T')[0],
            category: '',
            amount: 0,
            paymentMethod: 'Bank Transfer',
            description: ''
        });
        loadData();
    } catch (e) {
        showToast('Error saving disbursement', 'error');
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('disbursements.title')}</h1>
                <p className="text-slate-500">{t('disbursements.subtitle')}</p>
            </div>
            {viewState === 'LIST' && (
                <button onClick={() => setViewState('CREATE')} className="bg-[#D4A373] text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#c29263] shadow-lg shadow-[#D4A373]/30 transition-all">
                    <Plus size={18} /> {t('btn.newExpense')}
                </button>
            )}
       </div>

       {viewState === 'LIST' && (
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
       )}

       {viewState === 'CREATE' && (
           <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
               <div className="p-4 border-b bg-[#F8F2EC] flex justify-between items-center">
                   <h3 className="font-bold text-slate-800">{t('modal.newDisbursement')}</h3>
                   <button onClick={() => setViewState('LIST')} className="text-slate-400 hover:text-red-500"><XCircle size={20}/></button>
               </div>
               
               <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.date')}</label>
                           <div className="relative">
                               <Calendar className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={16}/>
                               <input type="date" className={`w-full ${lang === 'ar' ? 'pr-10' : 'pl-10'} border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]`}
                                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.amount')}</label>
                           <div className="relative">
                               <DollarSign className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={16}/>
                               <input type="number" className={`w-full ${lang === 'ar' ? 'pr-10' : 'pl-10'} border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]`}
                                value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                           </div>
                       </div>
                   </div>

                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.category')}</label>
                       <select className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]"
                        value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                       >
                           <option value="">-- {t('lbl.category')} --</option>
                           <option value="Raw Materials">Raw Materials (Fabric/Thread)</option>
                           <option value="Logistics">Logistics & Delivery</option>
                           <option value="Rent">Rent</option>
                           <option value="Salaries">Salaries</option>
                           <option value="Utilities">Utilities (Electricity/Water)</option>
                           <option value="Marketing">Marketing</option>
                           <option value="Maintenance">Equipment Maintenance</option>
                           <option value="Other">Other</option>
                       </select>
                   </div>
                   
                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.description')}</label>
                       <textarea className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" rows={3}
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                       />
                   </div>

                   <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                       <div className="col-span-2 text-xs font-bold text-slate-400 uppercase">Associations (Optional)</div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.supplier')}</label>
                           <select className="w-full border-slate-300 rounded-lg text-sm"
                            value={formData.supplierId || ''} onChange={e => setFormData({...formData, supplierId: e.target.value})}
                           >
                               <option value="">-- None --</option>
                               {suppliers.map(s => <option key={s.id} value={s.id}>{s.company}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.paymentMethod')}</label>
                           <select className="w-full border-slate-300 rounded-lg text-sm"
                            value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}
                           >
                               <option value="Bank Transfer">Bank Transfer</option>
                               <option value="Cash">Cash</option>
                               <option value="Check">Check</option>
                               <option value="Card">Card</option>
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.relatedContract')}</label>
                           <select className="w-full border-slate-300 rounded-lg text-sm"
                            value={formData.contractId || ''} onChange={e => setFormData({...formData, contractId: e.target.value})}
                           >
                               <option value="">-- None --</option>
                               {contracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber} - {c.clientName}</option>)}
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.relatedProject')}</label>
                           <select className="w-full border-slate-300 rounded-lg text-sm"
                            value={formData.projectId || ''} onChange={e => setFormData({...formData, projectId: e.target.value})}
                           >
                               <option value="">-- None --</option>
                               {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                       </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                       <button onClick={() => setViewState('LIST')} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium">{t('btn.cancel')}</button>
                       <button onClick={handleSave} className="bg-[#D4A373] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c29263] shadow-lg">{t('btn.submit')}</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default Disbursements;
