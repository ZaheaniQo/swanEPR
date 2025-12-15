
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Product, ProductSize, QualityLevel, Role } from '../types';
import { Plus, Trash2, Edit2, Search, Shirt, Tag, DollarSign, X, Check, Save, Filter } from 'lucide-react';

const Products: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const initialForm: Partial<Product> = {
      name: '',
      description: '',
      category: 'Medical Uniforms',
      qualityLevel: QualityLevel.STANDARD,
      notes: '',
      skuPrefix: '',
      sizes: []
  };
  const [formData, setFormData] = useState<Partial<Product>>(initialForm);

  const canEdit = currentUserRole === Role.CEO || currentUserRole === Role.PRODUCTION_MANAGER || currentUserRole === Role.WAREHOUSE;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getProducts();
    setProducts(data);
  };

  const handleSave = async () => {
      if (!formData.name || !formData.sizes || formData.sizes.length === 0) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }

      const productToSave = {
          ...formData,
          skuPrefix: formData.skuPrefix || formData.name?.substring(0,3).toUpperCase(),
      } as Product;

      if (editingId) {
          await dataService.updateProduct(editingId, productToSave);
          showToast(t('msg.saved'), 'success');
      } else {
          productToSave.id = Math.random().toString(36).substr(2, 9);
          await dataService.addProduct(productToSave);
          showToast(t('msg.saved'), 'success');
      }

      setIsModalOpen(false);
      resetForm();
      loadData();
  };

  const handleDelete = async (id: string) => {
      if (!canEdit) return;
      if (confirm(t('btn.delete') + '?')) {
          await dataService.deleteProduct(id);
          showToast(t('msg.deleted'), 'info');
          loadData();
      }
  };

  const openEdit = (product: Product) => {
      setFormData(product);
      setEditingId(product.id);
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setFormData(initialForm);
      setEditingId(null);
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

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('products.title')}</h1>
                <p className="text-slate-500">{t('products.subtitle')}</p>
            </div>
            {canEdit && (
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-[#D4A373] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#c29263] shadow-lg shadow-[#D4A373]/30 transition-all"
                >
                    <Plus size={18} /> {t('btn.addProduct')}
                </button>
            )}
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#D4A373]/30 flex items-center gap-4">
             <div className="relative flex-1">
                 <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} size={18} />
                 <input 
                    className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-slate-200 rounded-lg focus:ring-[#D4A373] focus:border-[#D4A373]`}
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <div className="hidden md:flex gap-2 text-slate-500 text-sm font-medium">
                 <Filter size={16} /> {filteredProducts.length} Items
             </div>
        </div>

        {/* Product List */}
        <div className="space-y-4">
            {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                    <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border
                                    ${product.qualityLevel === QualityLevel.PREMIUM ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      product.qualityLevel === QualityLevel.STANDARD ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                      'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {product.qualityLevel}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">SKU: {product.skuPrefix}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                                {product.name}
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">{product.category}</p>
                            
                            {product.notes && (
                                <p className="text-xs text-slate-400 bg-[#F8F2EC] p-2 rounded inline-block">
                                    {product.notes}
                                </p>
                            )}
                        </div>

                        {/* Sizes Grid */}
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                        <th className="p-2 font-medium">{t('col.size')}</th>
                                        <th className="p-2 font-medium text-slate-400">{t('col.cost')}</th>
                                        <th className="p-2 font-medium text-slate-800">{t('col.price')}</th>
                                        <th className="p-2 font-medium text-emerald-600">{t('col.margin')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {product.sizes.map(size => (
                                        <tr key={size.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F2EC]/50">
                                            <td className="p-2 font-bold">{size.size}</td>
                                            <td className="p-2 text-slate-400">{size.cost}</td>
                                            <td className="p-2 font-bold text-slate-800">{size.price}</td>
                                            <td className="p-2 text-emerald-600 font-bold">{(size.price - size.cost).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        {canEdit && (
                            <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                <button onClick={() => openEdit(product)} className="p-2 rounded-lg bg-slate-50 hover:bg-[#D4A373] hover:text-white transition-colors text-slate-500">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg bg-red-50 hover:bg-red-500 hover:text-white transition-colors text-red-500">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {filteredProducts.length === 0 && (
                <div className="text-center py-20 text-slate-400">No products found.</div>
            )}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-[#D4A373]/20 bg-[#F8F2EC] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Shirt size={20} className="text-[#D4A373]" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">{editingId ? t('btn.edit') : t('btn.addProduct')}</h3>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="label">{t('col.productName')}</label>
                                <input className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Surgical Gown Type A" />
                            </div>
                            <div>
                                <label className="label">{t('lbl.category')}</label>
                                <input className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} list="categories" />
                                <datalist id="categories">
                                    <option value="Medical Uniforms"/>
                                    <option value="Scrubs"/>
                                    <option value="Lab Coats"/>
                                    <option value="Patient Wear"/>
                                </datalist>
                            </div>
                            <div>
                                <label className="label">{t('lbl.quality')}</label>
                                <select className="input-field" value={formData.qualityLevel} onChange={e => setFormData({...formData, qualityLevel: e.target.value as QualityLevel})}>
                                    {Object.values(QualityLevel).map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                             <div className="col-span-2">
                                <label className="label">{t('lbl.description')}</label>
                                <textarea className="input-field" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Fabric details, stitching notes..." />
                            </div>
                        </div>

                        {/* Sizes Manager */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-sm">{t('lbl.variants')}</span>
                                <button onClick={addSize} className="text-xs font-bold flex items-center gap-1 text-[#D4A373] hover:text-[#b08558] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <Plus size={14} /> {t('btn.add')}
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-slate-500 text-xs">
                                        <tr>
                                            <th className="p-3 w-24">{t('col.size')}</th>
                                            <th className="p-3">{t('col.cost')} ({t('currency')})</th>
                                            <th className="p-3">{t('col.price')} ({t('currency')})</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.sizes?.map(size => (
                                            <tr key={size.id} className="bg-white">
                                                <td className="p-2">
                                                    <input className="w-full border-slate-200 rounded text-center font-bold text-slate-800 focus:ring-[#D4A373]" 
                                                        value={size.size} onChange={e => updateSize(size.id, 'size', e.target.value)} placeholder="M" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" className="w-full border-slate-200 rounded text-slate-600 focus:ring-[#D4A373]" 
                                                        value={size.cost} onChange={e => updateSize(size.id, 'cost', Number(e.target.value))} />
                                                </td>
                                                <td className="p-2">
                                                     <input type="number" className="w-full border-slate-200 rounded font-bold text-slate-800 focus:ring-[#D4A373]" 
                                                        value={size.price} onChange={e => updateSize(size.id, 'price', Number(e.target.value))} />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeSize(size.id)} className="text-slate-300 hover:text-red-500"><X size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-500 font-medium hover:text-slate-800">{t('btn.cancel')}</button>
                        <button onClick={handleSave} className="bg-[#D4A373] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#c29263] flex items-center gap-2 shadow-lg shadow-[#D4A373]/20">
                            <Save size={18} /> {t('btn.save')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <style>{`
            .label { @apply block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5; }
            .input-field { @apply w-full border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4A373]/20 focus:border-[#D4A373] transition-all py-2 text-sm; }
        `}</style>
    </div>
  );
};

export default Products;
