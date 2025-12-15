
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Quotation, QuotationItem, Customer, Product } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Plus, Trash2, Save } from 'lucide-react';

const QuotationForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotation, setQuotation] = useState<Partial<Quotation>>({
      customerName: '', customerCompany: '', customerPhone: '', customerEmail: '',
      date: new Date().toISOString().split('T')[0],
      items: []
  });

  useEffect(() => {
    Promise.all([
        dataService.getCustomers(),
        dataService.getProducts()
    ]).then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
    });
  }, []);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cust = customers.find(c => c.id === e.target.value);
      if (cust) {
          setQuotation(prev => ({
              ...prev,
              customerName: cust.name,
              customerCompany: cust.company,
              customerPhone: cust.phone,
              customerEmail: cust.email
          }));
      }
  };

  const addItem = () => {
      const newItem: QuotationItem = { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0, total: 0 };
      setQuotation(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
      setQuotation(prev => ({
          ...prev,
          items: prev.items?.map(i => {
              if (i.id === id) {
                  const updated = { ...i, [field]: value };
                  updated.total = updated.quantity * updated.unitPrice;
                  return updated;
              }
              return i;
          })
      }));
  };

  const removeItem = (id: string) => {
      setQuotation(prev => ({ ...prev, items: prev.items?.filter(i => i.id !== id) }));
  };

  const handleSave = async () => {
      if (!quotation.customerName || !quotation.items?.length) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      const subtotal = quotation.items.reduce((sum, i) => sum + i.total, 0);
      const vat = subtotal * 0.15;
      
      const newQ = {
          ...quotation,
          id: crypto.randomUUID(),
          quotationNumber: `QT-${Date.now().toString().substr(-6)}`,
          subtotal,
          vatAmount: vat,
          totalAmount: subtotal + vat,
          status: 'PENDING',
          expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      } as Quotation;

      await dataService.addQuotation(newQ);
      showToast(t('msg.quotationCreated'), 'success');
      navigate('/quotations');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title={t('quotations.new')} actions={<Button variant="ghost" onClick={() => navigate('/quotations')}>{t('btn.cancel')}</Button>} />
        
        <Card>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label={t('quotations.customerSelect')} onChange={handleCustomerSelect}>
                        <option value="">-- Select --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                    </Select>
                    <Input label={t('quotations.customerName')} value={quotation.customerName} onChange={e => setQuotation({...quotation, customerName: e.target.value})} />
                    <Input label={t('col.company')} value={quotation.customerCompany} onChange={e => setQuotation({...quotation, customerCompany: e.target.value})} />
                    <Input label={t('col.date')} type="date" value={quotation.date} onChange={e => setQuotation({...quotation, date: e.target.value})} />
                </div>

                <div className="border-t border-border pt-6">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold">{t('quotations.lineItems')}</h3>
                        <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1"/> {t('btn.addLine')}</Button>
                    </div>
                    {quotation.items?.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-end bg-secondary/20 p-2 rounded">
                            <div className="col-span-5">
                                <Input placeholder={t('quotations.item')} value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <Input type="number" placeholder={t('col.quantity')} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                            </div>
                            <div className="col-span-2">
                                <Input type="number" placeholder={t('quotations.unitPrice')} value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                            </div>
                            <div className="col-span-2 font-bold text-right py-2">
                                {item.total.toFixed(2)}
                            </div>
                            <div className="col-span-1 text-center">
                                <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                <Button className="w-full" onClick={handleSave}><Save size={18} className="mr-2"/> {t('btn.save')}</Button>
            </CardContent>
        </Card>
    </div>
  );
};

export default QuotationForm;
