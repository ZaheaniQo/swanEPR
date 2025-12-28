
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Quotation, QuotationItem, Customer, Product } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Plus, Trash2, Save } from 'lucide-react';

const QuotationForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quotation, setQuotation] = useState<Partial<Quotation>>({
      customerName: '', customerCompany: '', customerPhone: '', customerEmail: '',
      customerAddress: '', customerVat: '',
      date: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: []
  });
  const subtotal = (quotation.items || []).reduce((sum, i) => sum + i.total, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const statusLabel = quotation.status ?? t('quotations.status.draft');

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
      const custId = e.target.value;
      setSelectedCustomerId(custId);
      const cust = customers.find(c => c.id === custId);
      if (cust) {
          setQuotation(prev => ({
              ...prev,
              customerName: cust.name,
              customerCompany: cust.company,
              customerPhone: cust.phone,
              customerEmail: cust.email,
              customerAddress: cust.address,
              customerVat: cust.vatNumber
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
      if (!quotation.customerName || !quotation.items?.length || !selectedCustomerId) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      const subtotal = quotation.items.reduce((sum, i) => sum + i.total, 0);
      const vat = subtotal * 0.15;
      
      const newQ = {
          ...quotation,
          id: crypto.randomUUID(),
          quotationNumber: `QT-${Date.now().toString().substr(-6)}`,
          customerId: selectedCustomerId,
          subtotal,
          vatAmount: vat,
          totalAmount: subtotal + vat,
          status: 'PENDING'
      } as Quotation;

      await dataService.addQuotation(newQ);
      showToast(t('msg.quotationCreated'), 'success');
      navigate('/quotations');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title={t('quotations.new')} />
        
        <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="uppercase text-xs font-semibold">{t('status')}</span>
            <span className="px-2 py-1 rounded-full border border-border bg-secondary/40 text-text">{statusLabel}</span>
        </div>

        <Card>
            <CardContent className="p-6 space-y-6">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">{t('documents.section.info')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label={t('col.date')} type="date" value={quotation.date} onChange={e => setQuotation({...quotation, date: e.target.value})} />
                        <Input label={t('quotations.expiry')} type="date" value={quotation.expiryDate} onChange={e => setQuotation({...quotation, expiryDate: e.target.value})} />
                    </div>
                </div>

                <div className="border-t border-border pt-6">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">{t('documents.section.customer')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label={t('quotations.customerSelect')} value={selectedCustomerId} onChange={handleCustomerSelect}>
                            <option value="">{t('quotations.selectPlaceholder')}</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                        </Select>
                        <Input label={t('quotations.customerName')} value={quotation.customerName} onChange={e => setQuotation({...quotation, customerName: e.target.value})} />
                        <Input label={t('col.company')} value={quotation.customerCompany} onChange={e => setQuotation({...quotation, customerCompany: e.target.value})} />
                        <Input label={t('col.address')} value={quotation.customerAddress} onChange={e => setQuotation({...quotation, customerAddress: e.target.value})} />
                        <Input label={t('quotations.vat')} value={quotation.customerVat} onChange={e => setQuotation({...quotation, customerVat: e.target.value})} className="font-mono" />
                    </div>
                </div>

                <div className="border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{t('documents.section.items')}</div>
                        <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1"/> {t('btn.addLine')}</Button>
                    </div>
                    <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary/10 text-text-muted text-xs">
                                <tr>
                                    <th className="p-3">{t('quotations.item')}</th>
                                    <th className="p-3 text-center">{t('col.quantity')}</th>
                                    <th className="p-3 text-right">{t('quotations.unitPrice')}</th>
                                    <th className="p-3 text-right">{t('quotations.total')}</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {quotation.items?.map(item => (
                                    <tr key={item.id} className="bg-surface">
                                        <td className="p-2">
                                            <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2 text-right font-semibold">{item.total.toFixed(2)}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-secondary/5 border-t border-border">
                                <tr>
                                    <td className="p-3 text-right font-semibold" colSpan={4}>{t('quotations.total')}</td>
                                    <td className="p-3 text-right font-bold">{total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="border-t border-border pt-6 flex justify-end">
                    <div className="w-72 space-y-2 text-right text-sm">
                        <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{t('documents.section.totals')}</div>
                        <div className="flex justify-between text-text-muted"><span>{t('quotations.subtotal')}</span> <span>{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-text-muted"><span>{t('quotations.vat')}</span> <span>{vat.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-lg text-text pt-2 border-t border-border">
                            <span>{t('quotations.total')}</span>
                            <span>{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="pt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => navigate('/quotations')}>{t('btn.cancel')}</Button>
            <Button onClick={handleSave}><Save size={18} className="mr-2"/> {t('btn.save')}</Button>
        </div>
    </div>
  );
};

export default QuotationForm;
