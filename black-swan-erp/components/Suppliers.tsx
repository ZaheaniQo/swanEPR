
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Supplier, SupplierType, Role, Disbursement } from '../types';
import { Plus, Trash2, Edit2, Search, Truck, Package, Wrench, Filter, User, X } from 'lucide-react';

const Suppliers: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
      name: '', company: '', email: '', phone: '', address: '', crNumber: '', type: SupplierType.RAW_MATERIAL, notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getSuppliers();
    const disbs = await dataService.getDisbursements();
    setSuppliers(data);
        setDisbursements((disbs as any).items ?? disbs);
  };

  const handleSave = async () => {
    if (!formData.company || !formData.phone) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }

    if (editingId) {
        await dataService.updateSupplier(editingId, formData);
        showToast(t('msg.saved'), 'success');
    } else {
        await dataService.addSupplier({
            ...formData as Supplier,
            id: Math.random().toString(36).substr(2, 9)
        });
        showToast(t('msg.saved'), 'success');
    }
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('btn.delete') + '?')) {
        await dataService.deleteSupplier(id);
        showToast(t('msg.deleted'), 'info');
        loadData();
    }
  };

  const openEdit = (supplier: Supplier) => {
      setFormData(supplier);
      setEditingId(supplier.id);
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setFormData({ name: '', company: '', email: '', phone: '', address: '', crNumber: '', type: SupplierType.RAW_MATERIAL, notes: '' });
      setEditingId(null);
  };

  const filteredSuppliers = suppliers.filter(s => {
      const matchesSearch = s.company.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || s.type === filterType;
      return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: SupplierType) => {
      switch(type) {
          case SupplierType.LOGISTICS: return <Truck size={16} />;
          case SupplierType.RAW_MATERIAL: return <Package size={16} />;
          default: return <Wrench size={16} />;
      }
  };

  const roseGoldBorder = 'border-[#D4A373]';
  const roseGoldText = 'text-[#D4A373]';
  const roseGoldBg = 'bg-[#F8F2EC]';
  const blackText = 'text-slate-900';

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <div className="flex justify-between items-center">
            <div>
                <h1 className={`text-2xl font-bold ${blackText}`}>{t('suppliers.title')}</h1>
                <p className="text-slate-500">{t('suppliers.subtitle')}</p>
            </div>
            {currentUserRole !== Role.PARTNER && (
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-[#D4A373] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#c29263] shadow-md transition-all"
                >
                    <Plus size={18} /> {t('btn.create')}
                </button>
            )}
        </div>

        {/* Filters */}
        <div className={`flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border ${roseGoldBorder}`}>
             <div className="relative flex-1">
                 <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={18} />
                 <input 
                    className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-slate-200 rounded-lg focus:ring-[#D4A373] focus:border-[#D4A373]`}
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <div className="flex items-center gap-2 overflow-x-auto">
                 <button onClick={() => setFilterType('All')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'All' ? 'bg-[#D4A373] text-white' : 'bg-slate-100 text-slate-600'}`}>{t('filter.all')}</button>
                 {(Object.values(SupplierType) as string[]).map(type => (
                     <button 
                        key={type} 
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === type ? 'bg-[#D4A373] text-white' : 'bg-slate-100 text-slate-600'}`}
                     >
                         {type}
                     </button>
                 ))}
             </div>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map(s => {
                const totalExpenses = disbursements
                    .filter(d => d.supplierId === s.id && d.approvalStatus === 'APPROVED')
                    .reduce((sum, d) => sum + d.amount, 0);

                return (
                <div key={s.id} className={`bg-white rounded-xl shadow-sm border ${roseGoldBorder} p-6 hover:shadow-md transition-all relative group`}>
                     <div className="flex justify-between items-start mb-4">
                         <div className={`w-10 h-10 rounded-full ${roseGoldBg} flex items-center justify-center ${roseGoldText}`}>
                             {getTypeIcon(s.type)}
                         </div>
                         <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{s.type}</span>
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mb-1">{s.company}</h3>
                     <p className="text-sm text-slate-500 mb-4 flex items-center gap-1"><User size={14} className="inline"/> {s.name}</p>
                     
                     <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
                         <p><strong>{t('col.phone')}:</strong> {s.phone}</p>
                         <p><strong>{t('col.email')}:</strong> {s.email}</p>
                         <p><strong>{t('lbl.address')}:</strong> {s.address}</p>
                     </div>
                     
                     <div className="mt-4 bg-red-50 p-2 rounded text-center text-xs font-bold text-red-600 border border-red-100">
                         {t('col.totalPaid')}: {totalExpenses.toLocaleString()} {t('currency')}
                     </div>

                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                         <button onClick={() => openEdit(s)} className="p-1.5 bg-slate-100 rounded text-slate-600 hover:text-[#D4A373]"><Edit2 size={16} /></button>
                         {currentUserRole !== Role.ACCOUNTING && (
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-red-50 rounded text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                         )}
                     </div>
                </div>
            )})}
            {filteredSuppliers.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-400">No suppliers found.</div>
            )}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-[#D4A373]">
                    <div className={`p-4 border-b ${roseGoldBg} flex justify-between items-center`}>
                        <h3 className="font-bold text-slate-800">{editingId ? t('modal.editSupplier') : t('modal.addSupplier')}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.company')}</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.contact')}</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.supplierType')}</label>
                                <select className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as SupplierType})}>
                                    {(Object.values(SupplierType) as string[]).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.phone')}</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('col.email')}</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.address')}</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                             <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">{t('lbl.notes')}</label>
                                <textarea className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700">{t('btn.cancel')}</button>
                        <button onClick={handleSave} className="bg-[#D4A373] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c29263]">{t('btn.save')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Suppliers;