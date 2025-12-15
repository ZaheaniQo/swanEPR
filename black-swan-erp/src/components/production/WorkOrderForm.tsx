import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { erpService } from '../../services/supabase/erp.service';
import { BillOfMaterials, WorkOrder, Warehouse } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { ArrowLeft, Save } from 'lucide-react';

const WorkOrderForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useApp();
  
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    number: `WO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    bomId: '',
    warehouseId: '',
    quantity: 1,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'PLANNED',
    notes: ''
  });

  useEffect(() => {
    erpService.getBOMs().then(setBoms);
    erpService.getWarehouses().then(setWarehouses);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bomId || !formData.warehouseId) {
        showToast('Please select a BOM and Warehouse', 'error');
        return;
    }
    
    setLoading(true);
    try {
        const selectedBom = boms.find(b => b.id === formData.bomId);
        
        await erpService.createWorkOrder({
            number: formData.number,
            bomId: formData.bomId,
            productId: selectedBom?.productId,
            warehouseId: formData.warehouseId,
            quantityPlanned: formData.quantity,
            dueDate: formData.dueDate,
            status: formData.status as any,
            notes: formData.notes
        });
        
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
            title="New Work Order"
            actions={
                <Button variant="outline" onClick={() => navigate('/production')}>
                    <ArrowLeft size={16} className="mr-2" /> {t('btn.back')}
                </Button>
            }
        />
        
        <Card>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="WO Number" 
                            value={formData.number} 
                            onChange={e => setFormData({...formData, number: e.target.value})} 
                            required 
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bill of Materials (BOM)</label>
                            <select 
                                className="w-full p-2 border rounded-md"
                                value={formData.bomId}
                                onChange={e => setFormData({...formData, bomId: e.target.value})}
                                required
                            >
                                <option value="">Select BOM</option>
                                {boms.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} (v{b.version})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Warehouse</label>
                            <select 
                                className="w-full p-2 border rounded-md"
                                value={formData.warehouseId}
                                onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                                required
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        <Input 
                            label="Quantity to Produce" 
                            type="number"
                            value={formData.quantity} 
                            onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} 
                            required 
                        />
                        <Input 
                            label="Due Date" 
                            type="date"
                            value={formData.dueDate} 
                            onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                            required 
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select 
                                className="w-full p-2 border rounded-md"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="PLANNED">Planned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea 
                            className="w-full p-2 border rounded-md h-24"
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            <Save size={16} className="mr-2" /> {loading ? 'Saving...' : 'Create Work Order'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
};

export default WorkOrderForm;