
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Supplier, SupplierType, Role, Disbursement } from '../types';
import { Plus, Edit2, Search, Truck, Package, Wrench, User } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

const Suppliers: React.FC = () => {
  const { t, lang } = useTranslation();
  const { currentUserRole } = useApp();
  const navigate = useNavigate();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getSuppliers();
    const disbs = await dataService.getDisbursements();
    setSuppliers(data);
    setDisbursements(disbs.items);
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

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <PageHeader 
          title={t('suppliers.title')} 
          subtitle={t('suppliers.subtitle')}
          actions={
            currentUserRole !== Role.PARTNER && (
              <Button onClick={() => navigate('/suppliers/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none">
                <Plus size={18} className="mr-2" /> {t('btn.create')}
              </Button>
            )
          }
        />

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

        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className={`${roseGoldBg} text-slate-700 font-bold uppercase tracking-wider`}>
                    <tr>
                        <th className="p-4">{t('col.company')}</th>
                        <th className="p-4">{t('col.type')}</th>
                        <th className="p-4">{t('col.contact')}</th>
                        <th className="p-4">{t('col.vat')}</th>
                        <th className="p-4">{t('col.cr')}</th>
                        <th className="p-4 text-right">{t('col.totalPaid')}</th>
                        <th className="p-4 text-center">{t('col.actionsColumn')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map(s => {
                        const totalExpenses = disbursements
                            .filter(d => d.supplierId === s.id && d.approvalStatus === 'APPROVED')
                            .reduce((sum, d) => sum + d.amount, 0);
                        return (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/suppliers/${s.id}/edit`)}>
                                <td className="p-4">
                                    <div className="font-bold text-slate-900">{s.company || s.name}</div>
                                    <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                        <User size={12} className={roseGoldText}/> {s.contactPerson || s.name || t('common.na')}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-600">
                                    <span className="inline-flex items-center gap-2">
                                        {getTypeIcon(s.type)} {s.type}
                                    </span>
                                </td>
                                <td className="p-4 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span className="font-mono">{s.phone || t('common.na')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span>{s.email || t('common.na')}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-500">{s.vatNumber || t('common.na')}</td>
                                <td className="p-4 font-mono text-slate-500">{s.crNumber || t('common.na')}</td>
                                <td className="p-4 text-right font-bold text-slate-900">{totalExpenses.toLocaleString()} {t('currency')}</td>
                                <td className="p-4 text-center">
                                    <Button size="sm" variant="ghost" className="hover:text-[#D4A373]" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${s.id}/edit`); }}>
                                        <Edit2 size={16}/>
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredSuppliers.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                                <div className="space-y-3">
                                    <div>{t('suppliers.empty')}</div>
                                    {currentUserRole !== Role.PARTNER && (
                                        <Button onClick={() => navigate('/suppliers/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none">
                                            <Plus size={16} className="mr-2" /> {t('btn.create')}
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Suppliers Grid */}
        <div className="md:hidden grid grid-cols-1 gap-6">
            {filteredSuppliers.map(s => {
                const totalExpenses = disbursements
                    .filter(d => d.supplierId === s.id && d.approvalStatus === 'APPROVED')
                    .reduce((sum, d) => sum + d.amount, 0);

                return (
                                <div
                                    key={s.id}
                                    role="button"
                                    tabIndex={0}
                                    className={`bg-white rounded-xl shadow-sm border ${roseGoldBorder} p-6 hover:shadow-md transition-all relative group cursor-pointer`}
                                    onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            navigate(`/suppliers/${s.id}/edit`);
                                        }
                                    }}
                                >
                     <div className="flex justify-between items-start mb-4">
                         <div className={`w-10 h-10 rounded-full ${roseGoldBg} flex items-center justify-center ${roseGoldText}`}>
                             {getTypeIcon(s.type)}
                         </div>
                         <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{s.type}</span>
                     </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{s.company || s.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 flex items-center gap-1"><User size={14} className="inline"/> {s.contactPerson || s.name}</p>
                     
                     <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
                         <p><strong>{t('col.phone')}:</strong> {s.phone || t('common.na')}</p>
                         <p><strong>{t('col.email')}:</strong> {s.email || t('common.na')}</p>
                        <p><strong>{t('col.vat')}:</strong> {s.vatNumber || t('common.na')}</p>
                        <p><strong>{t('col.cr')}:</strong> {s.crNumber || t('common.na')}</p>
                        <p className="truncate"><strong>{t('lbl.address')}:</strong> {s.address || t('common.na')}</p>
                     </div>
                     
                     <div className="mt-4 bg-red-50 p-2 rounded text-center text-xs font-bold text-red-600 border border-red-100">
                         {t('col.totalPaid')}: {totalExpenses.toLocaleString()} {t('currency')}
                     </div>

                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-1.5 bg-slate-100 rounded text-slate-600 hover:text-[#D4A373]"><Edit2 size={16} /></button>
                     </div>
                </div>
            )})}
            {filteredSuppliers.length === 0 && (
                <div className="col-span-full p-8 text-center text-slate-400">
                    <div className="space-y-3">
                        <div>{t('suppliers.empty')}</div>
                        {currentUserRole !== Role.PARTNER && (
                            <Button onClick={() => navigate('/suppliers/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none">
                                <Plus size={16} className="mr-2" /> {t('btn.create')}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Suppliers;
