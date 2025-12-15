
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Customer, Role } from '../types';
import { Plus, Trash2, Edit2, Search, UserCheck, Briefcase, Mail, Phone, MapPin, X } from 'lucide-react';

const Customers: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
      name: '', company: '', email: '', phone: '', address: '', vatNumber: '', notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getCustomers();
    setCustomers(data);
  };

  const handleSave = async () => {
    if (!formData.company) {
        showToast('Company/Customer Name is required', 'error');
        return;
    }

    if (editingId) {
        await dataService.updateCustomer(editingId, formData);
        showToast('Customer updated', 'success');
    } else {
        await dataService.addCustomer({
            ...formData as Customer,
            id: Math.random().toString(36).substr(2, 9)
        });
        showToast('Customer added', 'success');
    }
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this customer?')) {
        await dataService.deleteCustomer(id);
        showToast('Customer deleted', 'info');
        loadData();
    }
  };

  const openEdit = (customer: Customer) => {
      setFormData(customer);
      setEditingId(customer.id);
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setFormData({ name: '', company: '', email: '', phone: '', address: '', vatNumber: '', notes: '' });
      setEditingId(null);
  };

  const filteredCustomers = customers.filter(c => 
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Theme Constants
  const roseGoldText = 'text-[#D4A373]';
  const roseGoldBorder = 'border-[#D4A373]';
  const beigeBg = 'bg-[#F8F2EC]';

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('customers.title')}</h1>
                <p className="text-slate-500">Manage client profiles and history.</p>
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

        {/* Search */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border ${roseGoldBorder}`}>
             <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                 <input 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-[#D4A373] focus:border-[#D4A373]"
                    placeholder="Search customers..."
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
                         <th className="p-4">Customer / Company</th>
                         <th className="p-4">Contact Info</th>
                         <th className="p-4">Location</th>
                         <th className="p-4">VAT No.</th>
                         <th className="p-4 text-center">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredCustomers.map(c => (
                         <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                             <td className="p-4">
                                 <div className="font-bold text-slate-900 text-lg">{c.company}</div>
                                 <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                    <UserCheck size={12} className={roseGoldText}/> {c.name}
                                 </div>
                             </td>
                             <td className="p-4 space-y-1.5">
                                 <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={14} className={roseGoldText}/> <span className="font-mono">{c.phone}</span>
                                </div>
                                 <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={14} className={roseGoldText}/> <span>{c.email}</span>
                                </div>
                             </td>
                             <td className="p-4 text-slate-600">
                                 <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-slate-400 mt-1 shrink-0"/> 
                                    <span className="max-w-[150px]">{c.address || '-'}</span>
                                </div>
                             </td>
                             <td className="p-4 font-mono text-slate-500">{c.vatNumber || '-'}</td>
                             <td className="p-4">
                                 <div className="flex justify-center gap-2">
                                     <button onClick={() => openEdit(c)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:text-[#D4A373] transition-colors"><Edit2 size={16}/></button>
                                     {currentUserRole !== Role.PARTNER && (
                                         <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                                     )}
                                 </div>
                             </td>
                         </tr>
                     ))}
                     {filteredCustomers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No customers found.</td></tr>}
                 </tbody>
             </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-[#D4A373]">
                    <div className={`p-4 border-b ${beigeBg} flex justify-between items-center`}>
                        <h3 className="font-bold text-slate-800">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Company / Legal Name</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input className="w-full pl-10 border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Representative Name</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">VAT Number</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373] font-mono" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373] font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                <input className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                                <textarea className="w-full border-slate-300 rounded-lg focus:border-[#D4A373] focus:ring-[#D4A373]" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700">Cancel</button>
                        <button onClick={handleSave} className="bg-[#D4A373] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c29263] transition-colors">Save Customer</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Customers;
