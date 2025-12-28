
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../AppContext';
import { erpService } from '../services/supabase/erp.service';
import { Asset, AssetCategory } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Monitor, Truck, Building, RefreshCw } from 'lucide-react';

const Assets: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assetsData, catsData] = await Promise.all([
        erpService.getAssets(),
        erpService.getAssetCategories()
      ]);
      setAssets(assetsData);
      setCategories(catsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (categoryName: string = '') => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('vehicle') || lower.includes('car')) return <Truck size={20} />;
    if (lower.includes('building') || lower.includes('office')) return <Building size={20} />;
    return <Monitor size={20} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('menu.assets') || 'Fixed Assets'} 
        subtitle={t('assets.subtitle') || 'Manage company assets and depreciation'}
        actions={
          <Button onClick={() => navigate('/assets/new')} className="flex items-center gap-2">
            <Plus size={16} /> {t('assets.add') || 'Add Asset'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Assets Value</p>
              <h3 className="text-2xl font-bold mt-1">
                {assets.reduce((sum, a) => sum + a.purchaseCost, 0).toLocaleString()} SAR
              </h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Monitor size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Active Assets</p>
              <h3 className="text-2xl font-bold mt-1">
                {assets.filter(a => a.status === 'ACTIVE').length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <RefreshCw size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary text-text-muted uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Asset Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Purchase Date</th>
                <th className="px-6 py-3">Cost</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-secondary/50">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        {getIcon(categories.find(c => c.id === asset.categoryId)?.name)}
                    </div>
                    <div>
                        <div className="text-text">{asset.name}</div>
                        <div className="text-xs text-text-muted">{asset.code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {categories.find(c => c.id === asset.categoryId)?.name || '-'}
                  </td>
                  <td className="px-6 py-4">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-mono">{asset.purchaseCost.toLocaleString()} SAR</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                    No assets found. Add your first asset to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Assets;
