
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Product, ProductSize, QualityLevel } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Save, Trash2, Plus, X } from 'lucide-react';

const ProductForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Product>>({
      name: '',
      description: '',
      category: 'Medical Uniforms',
      qualityLevel: QualityLevel.STANDARD,
      notes: '',
      skuPrefix: '',
      sizes: []
  });
  const [loading, setLoading] = useState(false);
  const headerTitle = formData.name?.trim() ? formData.name : t('product.new');

  useEffect(() => {
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (prodId: string) => {
    const prod = await dataService.getProductById(prodId);
    if (prod) setFormData(prod);
  };

  const handleSave = async () => {
      if (!formData.name || !formData.sizes || formData.sizes.length === 0) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }

      setLoading(true);
      const productToSave = {
          ...formData,
          skuPrefix: formData.skuPrefix || formData.name?.substring(0,3).toUpperCase(),
      } as Product;

      try {
        if (isEdit && id) {
            await dataService.updateProduct(id, productToSave);
            showToast(t('msg.saved'), 'success');
        } else {
            productToSave.id = Math.random().toString(36).substr(2, 9);
            await dataService.addProduct(productToSave);
            showToast(t('msg.saved'), 'success');
        }
        navigate('/products');
      } catch(e) {
        showToast(t('msg.actionFailed'), 'error');
      } finally {
        setLoading(false);
      }
  };

  const handleDelete = async () => {
      if (isEdit && id && confirm(t('btn.delete') + '?')) {
          await dataService.deleteProduct(id);
          showToast(t('msg.deleted'), 'info');
          navigate('/products');
      }
  };

  const addSize = () => {
      const newSize: ProductSize = {
          id: Math.random().toString(36).substr(2, 9),
          size: '',
          cost: 0,
          price: 0
      };
      setFormData(prev => ({ ...prev, sizes: [...(prev.sizes || []), newSize] }));
  };

  const updateSize = (id: string, field: keyof ProductSize, value: any) => {
      setFormData(prev => ({
          ...prev,
          sizes: prev.sizes?.map(s => s.id === id ? { ...s, [field]: value } : s)
      }));
  };

  const removeSize = (id: string) => {
      setFormData(prev => ({ ...prev, sizes: prev.sizes?.filter(s => s.id !== id) }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title={headerTitle} />

      {formData.availability && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="uppercase text-xs font-semibold">{t('status')}</span>
          <span className="px-2 py-1 rounded-full border border-border bg-secondary/40 text-text">{formData.availability}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{t('product.section.info')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                  <Input 
                    label={t('col.productName')} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">{t('lbl.category')}</label>
                  <input 
                    className="w-full bg-surface border border-input rounded-lg px-4 py-2 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    list="categories" 
                  />
                  <datalist id="categories">
                      <option value="Medical Uniforms"/>
                      <option value="Scrubs"/>
                      <option value="Lab Coats"/>
                      <option value="Patient Wear"/>
                  </datalist>
              </div>
              <div>
                  <Select 
                    label={t('lbl.quality')} 
                    value={formData.qualityLevel} 
                    onChange={e => setFormData({...formData, qualityLevel: e.target.value as QualityLevel})}
                  >
                      {Object.values(QualityLevel).map(q => <option key={q} value={q}>{q}</option>)}
                  </Select>
              </div>
               <div className="col-span-2">
                  <Textarea 
                    label={t('lbl.description')} 
                    rows={2} 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
              </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{t('product.section.sizes')}</span>
            <Button size="sm" variant="outline" onClick={addSize}>
              <Plus size={14} className="mr-1" /> {t('btn.add')}
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/10 text-text-muted text-xs">
                      <tr>
                          <th className="p-3 w-24">{t('col.size')}</th>
                          <th className="p-3">{t('col.cost')} ({t('currency')})</th>
                          <th className="p-3">{t('col.price')} ({t('currency')})</th>
                          <th className="p-3 w-10"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {formData.sizes?.map(size => (
                          <tr key={size.id} className="bg-surface">
                              <td className="p-2">
                                  <input className="w-full border-border border rounded text-center font-bold text-text focus:ring-primary/20 bg-background py-1" 
                                      value={size.size} onChange={e => updateSize(size.id, 'size', e.target.value)} />
                              </td>
                              <td className="p-2">
                                  <input type="number" className="w-full border-border border rounded text-text focus:ring-primary/20 bg-background py-1" 
                                      value={size.cost} onChange={e => updateSize(size.id, 'cost', Number(e.target.value))} />
                              </td>
                              <td className="p-2">
                                   <input type="number" className="w-full border-border border rounded font-bold text-text focus:ring-primary/20 bg-background py-1" 
                                      value={size.price} onChange={e => updateSize(size.id, 'price', Number(e.target.value))} />
                              </td>
                              <td className="p-2 text-center">
                                  <button onClick={() => removeSize(size.id)} className="text-text-muted hover:text-red-500"><X size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isEdit && (
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={18} className="mr-2" /> {t('btn.delete')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/products')}>
            {t('btn.cancel')}
          </Button>
        </div>
        <Button onClick={handleSave} loading={loading} className="bg-[#D4A373] hover:bg-[#c29263] border-none text-white">
          <Save size={18} className="mr-2" /> {t('btn.save')}
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;
