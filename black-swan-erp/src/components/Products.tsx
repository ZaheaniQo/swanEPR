
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Product, QualityLevel, Role } from '../types';
import { Plus, Edit2, Search, Filter } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';

const Products: React.FC = () => {
  const { t, lang } = useTranslation();
  const { currentUserRole } = useApp();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const canEdit = currentUserRole === Role.CEO || currentUserRole === Role.PRODUCTION_MANAGER || currentUserRole === Role.WAREHOUSE;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getProducts();
    setProducts(data);
  };

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <PageHeader 
          title={t('products.title')} 
          subtitle={t('products.subtitle')}
          actions={
            canEdit && (
              <Button onClick={() => navigate('/products/new')} className="bg-[#D4A373] hover:bg-[#c29263] border-none text-white">
                <Plus size={18} className="mr-2" /> {t('btn.addProduct')}
              </Button>
            )
          }
        />

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
                                        <th className="p-2 font-medium text-slate-400">{t('col.productCost')}</th>
                                        <th className="p-2 font-medium text-slate-800">{t('col.price')}</th>
                                        <th className="p-2 font-medium text-emerald-600">{t('col.margin')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {product.sizes.map(size => (
                                        <tr key={size.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F2EC]/50">
                                            <td className="p-2 font-bold">{size.size}</td>
                                            <td className="p-2 text-slate-400">{size.cost}</td>
                                            <td className="p-2 font-bold text-slate-800">{size.price} {t('currency')}</td>
                                            <td className="p-2 text-emerald-600 font-bold">{(size.price - size.cost).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        {canEdit && (
                            <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                <button onClick={() => navigate(`/products/${product.id}/edit`)} className="p-2 rounded-lg bg-slate-50 hover:bg-[#D4A373] hover:text-white transition-colors text-slate-500">
                                    <Edit2 size={18} />
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
    </div>
  );
};

export default Products;
