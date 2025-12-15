
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Disbursement, Supplier, Contract, Project } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Save } from 'lucide-react';

const DisbursementForm: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Disbursement>>({
      date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      paymentMethod: 'Bank Transfer',
      description: ''
  });

  useEffect(() => {
    Promise.all([
        dataService.getSuppliers(),
        dataService.getContracts(100),
        dataService.getProjects()
    ]).then(([s, c, p]) => {
        setSuppliers(s);
        setContracts(c.items);
        setProjects(p);
    });
  }, []);

  const handleSave = async () => {
    if (!formData.category || !formData.amount || !formData.description) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }
    
    setLoading(true);
    try {
        await dataService.addDisbursement(formData);
        showToast(t('msg.saved'), 'success');
        navigate('/disbursements');
    } catch (e) {
        showToast('Error saving disbursement', 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <PageHeader 
            title={t('modal.newDisbursement')} 
            actions={
                <Button variant="ghost" onClick={() => navigate('/disbursements')}>{t('btn.cancel')}</Button>
            }
       />
       
       <Card>
           <CardContent className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                   <div>
                       <Input 
                            label={t('col.date')} 
                            type="date"
                            value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})} 
                       />
                   </div>
                   <div>
                       <Input 
                            label={t('col.amount')} 
                            type="number"
                            value={formData.amount} 
                            onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                       />
                   </div>
               </div>

               <div>
                   <Select 
                        label={t('lbl.category')}
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
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
                   </Select>
               </div>
               
               <div>
                   <Textarea 
                        label={t('lbl.description')}
                        rows={3}
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})}
                   />
               </div>

               <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                   <div className="col-span-2 text-xs font-bold text-slate-400 uppercase">Associations (Optional)</div>
                   <div>
                       <Select 
                            label={t('lbl.supplier')}
                            value={formData.supplierId || ''} 
                            onChange={e => setFormData({...formData, supplierId: e.target.value})}
                       >
                           <option value="">-- None --</option>
                           {suppliers.map(s => <option key={s.id} value={s.id}>{s.company}</option>)}
                       </Select>
                   </div>
                   <div>
                       <Select 
                            label={t('lbl.paymentMethod')}
                            value={formData.paymentMethod} 
                            onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}
                       >
                           <option value="Bank Transfer">Bank Transfer</option>
                           <option value="Cash">Cash</option>
                           <option value="Check">Check</option>
                           <option value="Card">Card</option>
                       </Select>
                   </div>
                   <div>
                       <Select 
                            label={t('lbl.relatedContract')}
                            value={formData.contractId || ''} 
                            onChange={e => setFormData({...formData, contractId: e.target.value})}
                       >
                           <option value="">-- None --</option>
                           {contracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber} - {c.clientName}</option>)}
                       </Select>
                   </div>
                   <div>
                       <Select 
                            label={t('lbl.relatedProject')}
                            value={formData.projectId || ''} 
                            onChange={e => setFormData({...formData, projectId: e.target.value})}
                       >
                           <option value="">-- None --</option>
                           {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </Select>
                   </div>
               </div>

               <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                   <Button onClick={handleSave} loading={loading} className="bg-[#D4A373] hover:bg-[#c29263] border-none text-white">
                        <Save size={18} className="mr-2"/> {t('btn.submit')}
                   </Button>
               </div>
           </CardContent>
       </Card>
    </div>
  );
};

export default DisbursementForm;
