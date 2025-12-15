
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Customer } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Save, Trash2 } from 'lucide-react';

const CustomerForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Customer>>({
      name: '', company: '', email: '', phone: '', address: '', vatNumber: '', notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadCustomer(id);
    }
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    const cust = await dataService.getCustomerById(customerId);
    if (cust) setFormData(cust);
  };

  const handleSave = async () => {
    if (!formData.company) {
        showToast('Company/Customer Name is required', 'error');
        return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
          await dataService.updateCustomer(id, formData);
          showToast('Customer updated', 'success');
      } else {
          await dataService.addCustomer(formData as Customer);
          showToast('Customer added', 'success');
      }
      navigate('/customers');
    } catch (e) {
      showToast('Error saving customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isEdit && id && confirm(t('btn.delete') + '?')) {
        await dataService.deleteCustomer(id);
        showToast('Customer deleted', 'info');
        navigate('/customers');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title={isEdit ? 'Edit Customer' : 'Add New Customer'} 
        actions={
          <div className="flex gap-2">
            {isEdit && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={18} className="mr-2" /> {t('btn.delete')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/customers')}>
              {t('btn.cancel')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
                <Input 
                  label="Company / Legal Name" 
                  value={formData.company} 
                  onChange={e => setFormData({...formData, company: e.target.value})} 
                />
            </div>
            <div>
                <Input 
                  label="Representative Name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
            </div>
            <div>
                <Input 
                  label="VAT Number" 
                  value={formData.vatNumber} 
                  onChange={e => setFormData({...formData, vatNumber: e.target.value})} 
                  className="font-mono"
                />
            </div>
            <div>
                <Input 
                  label={t('col.phone')} 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
            </div>
            <div>
                <Input 
                  label={t('col.email')} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
            </div>
            <div className="col-span-2">
                <Input 
                  label={t('lbl.address')} 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
            </div>
            <div className="col-span-2">
                <Textarea 
                  label="Notes" 
                  rows={3}
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} loading={loading} className="bg-[#D4A373] hover:bg-[#c29263] border-none text-white">
              <Save size={18} className="mr-2" /> {t('btn.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerForm;
