
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Receipt, Contract } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Save } from 'lucide-react';

const ReceiptForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
      amount: 0,
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    dataService.getContracts().then(res => setContracts(res.items));
  }, []);

  const handleContractSelect = (contractId: string) => {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
          setNewReceipt({
              ...newReceipt,
              contractId: contract.id,
              contractTitle: contract.title,
              customerName: contract.clientName
          });
      }
  };

  const handleSave = async () => {
      if (!newReceipt.contractId || !newReceipt.amount) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      setLoading(true);
      try {
        const receipt: Receipt = {
            ...newReceipt as Receipt,
            id: Math.random().toString(36).substr(2, 9),
            receiptNumber: `RCPT-${Date.now().toString().substr(-6)}`,
        };
        await dataService.addReceipt(receipt);
        showToast(t('msg.receiptCreated'), 'success');
        navigate('/receipts');
      } catch (e) {
        showToast('Error creating receipt', 'error');
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader 
            title={t('receipts.new')} 
            actions={
                <Button variant="ghost" onClick={() => navigate('/receipts')}>{t('btn.cancel')}</Button>
            }
        />
        
        <Card>
            <CardContent className="p-8 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('receipts.selectContract')}</label>
                    <select 
                        className="w-full border-slate-300 rounded-lg p-2" 
                        onChange={e => handleContractSelect(e.target.value)}
                        value={newReceipt.contractId || ''}
                    >
                        <option value="">-- {t('receipts.selectContract')} --</option>
                        {contracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber} - {c.clientName} ({c.title})</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Input 
                            label={t('receipts.amountReceived')} 
                            type="number"
                            value={newReceipt.amount}
                            onChange={e => setNewReceipt({...newReceipt, amount: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <Input 
                            label={t('col.date')}
                            type="date" 
                            value={newReceipt.date}
                            onChange={e => setNewReceipt({...newReceipt, date: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Select 
                            label={t('lbl.paymentMethod')}
                            value={newReceipt.paymentMethod}
                            onChange={e => setNewReceipt({...newReceipt, paymentMethod: e.target.value as any})}
                        >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Check">Check</option>
                            <option value="POS">POS / Mada</option>
                        </Select>
                    </div>
                     <div>
                        <Input 
                            label={t('receipts.reference')} 
                            placeholder={t('optional')}
                            value={newReceipt.referenceNumber || ''}
                            onChange={e => setNewReceipt({...newReceipt, referenceNumber: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <Textarea 
                        label={t('lbl.notes')} 
                        rows={3}
                        value={newReceipt.notes || ''}
                        onChange={e => setNewReceipt({...newReceipt, notes: e.target.value})}
                    />
                </div>

                <div className="pt-6 flex justify-end">
                    <Button onClick={handleSave} loading={loading}>
                        <Save size={18} className="mr-2" /> {t('btn.save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
};

export default ReceiptForm;
