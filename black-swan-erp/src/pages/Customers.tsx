
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Customer, Role } from '../types';
import { Plus, Edit2, Search, UserCheck, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

const Customers: React.FC = () => {
  const { t, lang } = useTranslation();
  const { currentUserRole } = useApp();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getCustomers();
    setCustomers(data);
  };

    const filteredCustomers = customers.filter(c => {
      const company = (c.company || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return company.includes(query) || name.includes(query);
    });

  const roseGoldText = 'text-[#D4A373]';
  const roseGoldBorder = 'border-[#D4A373]';
  const beigeBg = 'bg-[#F8F2EC]';

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <PageHeader 
          title={t('customers.title')} 
          subtitle={t('customers.subtitle')}
          actions={
            currentUserRole !== Role.PARTNER && (
              <Button onClick={() => navigate('/customers/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none">
                <Plus size={18} className="mr-2" /> {t('btn.create')}
              </Button>
            )
          }
        />

        {/* Search */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border ${roseGoldBorder}`}>
             <div className="relative">
                <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={18} />
                 <input 
                  className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-slate-200 rounded-lg focus:ring-[#D4A373] focus:border-[#D4A373]`}
                  placeholder={t('customers.search')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <table className="w-full text-left text-sm">
                 <thead className={`${beigeBg} text-slate-700 font-bold uppercase tracking-wider`}>
                     <tr>
                     <th className="p-4">{t('customers.table.customerCompany')}</th>
                     <th className="p-4">{t('customers.table.contact')}</th>
                     <th className="p-4">{t('customers.table.location')}</th>
                     <th className="p-4">{t('customers.table.vat')}</th>
                     <th className="p-4 text-center">{t('customers.table.actions')}</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredCustomers.map(c => (
                         <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                             <td className="p-4">
                                 <div className="font-bold text-slate-900 text-lg">{c.company || t('common.na')}</div>
                                 <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                    <UserCheck size={12} className={roseGoldText}/> {c.name || t('common.na')}
                                 </div>
                             </td>
                             <td className="p-4 space-y-1.5">
                                 <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={14} className={roseGoldText}/> <span className="font-mono">{c.phone || t('common.na')}</span>
                                </div>
                                 <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={14} className={roseGoldText}/> <span>{c.email || t('common.na')}</span>
                                </div>
                             </td>
                             <td className="p-4 text-slate-600">
                                 <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-slate-400 mt-1 shrink-0"/> 
                                    <span className="max-w-[150px]">{c.address || t('common.na')}</span>
                                </div>
                             </td>
                             <td className="p-4 font-mono text-slate-500">{c.vatNumber || t('common.na')}</td>
                             <td className="p-4 text-center">
                                <Button size="sm" variant="ghost" className="hover:text-[#D4A373]">
                                    <Edit2 size={16}/>
                                </Button>
                             </td>
                         </tr>
                     ))}
                     {filteredCustomers.length === 0 && (
                         <tr>
                             <td colSpan={5} className="p-8 text-center text-slate-400">
                                 <div className="space-y-3">
                                     <div>{t('customers.empty')}</div>
                                     {currentUserRole !== Role.PARTNER && (
                                         <Button onClick={() => navigate('/customers/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none">
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
    </div>
  );
};

export default Customers;
