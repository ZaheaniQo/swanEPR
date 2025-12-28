import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { erpService } from '../../services/supabase/erp.service';
import { dataService } from '../../services/dataService';
import { Product, BOMItem } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

const BOMForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useApp();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    version: '1.0',
    isActive: true,
    outputQuantity: 1
  });

  const [items, setItems] = useState<Partial<BOMItem>[]>([
    { componentProductId: '', quantity: 1, wastagePercent: 0 }
  ]);

  useEffect(() => {
    dataService.getProducts().then(setProducts);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { componentProductId: '', quantity: 1, wastagePercent: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof BOMItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
        showToast('Please select a product', 'error');
        return;
    }
    
    setLoading(true);
    try {
        await erpService.createBOM({
            name: formData.name,
            productId: formData.productId,
            version: formData.version,
            isActive: formData.isActive,
            outputQuantity: formData.outputQuantity
        }, items.map(i => ({
            componentProductId: i.componentProductId,
            quantity: i.quantity,
            wastagePercent: i.wastagePercent
        })));
        
        showToast(t('msg.saved'), 'success');
        navigate('/production');
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
            title="New Bill of Materials"
            actions={
                <Button variant="outline" onClick={() => navigate('/production')}>
                    <ArrowLeft size={16} className="mr-2" /> {t('btn.back')}
                </Button>
            }
        />
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="BOM Name" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="e.g. Standard Chair Assembly"
                        required 
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Output Product</label>
                        <select 
                            className="w-full p-2 border rounded-md"
                            value={formData.productId}
                            onChange={e => setFormData({...formData, productId: e.target.value})}
                            required
                        >
                            <option value="">Select Product</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                        </select>
                    </div>
                    <Input 
                        label="Version" 
                        value={formData.version} 
                        onChange={e => setFormData({...formData, version: e.target.value})} 
                    />
                    <Input 
                        label="Output Quantity" 
                        type="number"
                        value={formData.outputQuantity} 
                        onChange={e => setFormData({...formData, outputQuantity: parseFloat(e.target.value)})} 
                    />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Raw Materials</h3>
                        <Button type="button" size="sm" onClick={handleAddItem}>
                            <Plus size={16} className="mr-2" /> Add Item
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Component</label>
                                    <select 
                                        className="w-full p-2 border rounded-md text-sm"
                                        value={item.componentProductId}
                                        onChange={e => handleItemChange(index, 'componentProductId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Material</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                                    <Input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Wastage %</label>
                                    <Input 
                                        type="number" 
                                        value={item.wastagePercent} 
                                        onChange={e => handleItemChange(index, 'wastagePercent', parseFloat(e.target.value))}
                                    />
                                </div>
                                <Button type="button" variant="danger" onClick={() => handleRemoveItem(index)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading} size="lg">
                    <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save BOM'}
                </Button>
            </div>
        </form>
    </div>
  );
};

export default BOMForm;