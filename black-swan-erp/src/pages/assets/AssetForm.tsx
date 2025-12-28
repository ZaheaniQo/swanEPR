import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { erpService } from '../../services/supabase/erp.service';
import { Asset, AssetCategory } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Save } from 'lucide-react';

const AssetForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useApp();
  
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    code: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0,
    salvageValue: 0,
    status: 'ACTIVE',
    location: '',
    serialNumber: ''
  });
  
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    erpService.getAssetCategories().then(setCategories);
    if (id) {
        // Fetch asset if editing - logic to be added
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await erpService.createAsset(formData);
        showToast(t('msg.saved'), 'success');
        navigate('/assets');
    } catch (error) {
        console.error(error);
        showToast(t('msg.error'), 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <PageHeader
            title={id ? 'Edit Asset' : 'New Asset'}
            actions={
                <Button variant="outline" onClick={() => navigate('/assets')}>
                    <ArrowLeft size={16} className="mr-2" /> {t('btn.back')}
                </Button>
            }
        />
        
        <Card>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Asset Name" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="Asset Code" 
                            value={formData.code} 
                            onChange={e => setFormData({...formData, code: e.target.value})} 
                        />
                        <div>
                            <label htmlFor="assetCategory" className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                id="assetCategory"
                                className="w-full p-2 border rounded-md"
                                value={formData.categoryId || ''}
                                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <Input 
                            label="Purchase Date" 
                            type="date"
                            value={formData.purchaseDate} 
                            onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="Purchase Cost" 
                            type="number"
                            value={formData.purchaseCost} 
                            onChange={e => setFormData({...formData, purchaseCost: parseFloat(e.target.value)})} 
                            required 
                        />
                        <Input 
                            label="Salvage Value" 
                            type="number"
                            value={formData.salvageValue} 
                            onChange={e => setFormData({...formData, salvageValue: parseFloat(e.target.value)})} 
                        />
                        <Input 
                            label="Location" 
                            value={formData.location} 
                            onChange={e => setFormData({...formData, location: e.target.value})} 
                        />
                        <Input 
                            label="Serial Number" 
                            value={formData.serialNumber} 
                            onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                        />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            <Save size={16} className="mr-2" /> {loading ? 'Saving...' : t('btn.save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
};

export default AssetForm;