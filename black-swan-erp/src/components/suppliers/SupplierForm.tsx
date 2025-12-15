
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Supplier, SupplierType } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Save, Trash2 } from 'lucide-react';

const SupplierForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Supplier>>({
      name: '', 
      company: '', 
      email: '', 
      phone: '', 
      address: '', 
      crNumber: '', 
      type: SupplierType.RAW_MATERIAL, 
      notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadSupplier(id);
    }
  }, [id]);

  const loadSupplier = async (supplierId: string) => {
    try {
      const supplier = await dataService.getSupplierById(supplierId);
      if (supplier) {
        setFormData(supplier);
      }
    } catch (error) {
      showToast('Error loading supplier', 'error');
      navigate('/suppliers');
    }
  };

  const handleSave = async () => {
    if (!formData.company || !formData.phone) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
          await dataService.updateSupplier(id, formData);
          showToast(t('msg.saved'), 'success');
      } else {
          await dataService.addSupplier(formData as Supplier);
          showToast(t('msg.saved'), 'success');
      }
      navigate('/suppliers');
    } catch (error) {
      showToast('Error saving supplier', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isEdit && id && confirm(t('btn.delete') + '?')) {
        await dataService.deleteSupplier(id);
        showToast(t('msg.deleted'), 'info');
        navigate('/suppliers');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader 
        title={isEdit ? t('modal.editSupplier') : t('modal.addSupplier')} 
        actions={
          <div className="flex gap-2">
            {isEdit && (
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={18} className="mr-2" /> {t('btn.delete')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/suppliers')}>
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
                  label={t('col.company')} 
                  value={formData.company} 
                  onChange={e => setFormData({...formData, company: e.target.value})} 
                  placeholder="Company Legal Name"
                />
            </div>
            <div>
                <Input 
                  label={t('col.contact')} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Representative Name"
                />
            </div>
            <div>
                <Select 
                  label={t('col.supplierType')} 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as SupplierType})}
                >
                    {Object.values(SupplierType).map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </Select>
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
            <div>
                <Input 
                  label="CR Number" 
                  value={formData.crNumber} 
                  onChange={e => setFormData({...formData, crNumber: e.target.value})} 
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
            <Button onClick={handleSave} loading={loading}>
              <Save size={18} className="mr-2" /> {t('btn.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierForm;
