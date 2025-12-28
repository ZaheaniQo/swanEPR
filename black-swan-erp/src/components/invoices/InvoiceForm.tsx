
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Customer, Product, TaxInvoice, TaxInvoiceItem, InvoiceType } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';

const InvoiceForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.STANDARD);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<TaxInvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
        dataService.getCustomers(),
        dataService.getProducts()
    ]).then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
    });
  }, []);

  const addItem = () => {
      setItems([...items, { description: '', quantity: 1, unitPrice: 0, netAmount: 0, vatRate: 0.15, vatAmount: 0, totalAmount: 0 }]);
  };

  const updateItem = (index: number, field: keyof TaxInvoiceItem, value: any) => {
      const newItems = [...items];
      const item = { ...newItems[index], [field]: value };
      
      // Recalculate line totals
      item.netAmount = item.quantity * item.unitPrice;
      item.vatAmount = item.netAmount * item.vatRate;
      item.totalAmount = item.netAmount + item.vatAmount;
      
      newItems[index] = item;
      setItems(newItems);
  };

  const removeItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
      const product = products.find(p => p.id === productId);
      if (product) {
          updateItem(index, 'description', product.name);
          // Default to first size price if available, else 0
          updateItem(index, 'unitPrice', product.sizes?.[0]?.price || 0);
      }
  };

  const handleSubmit = async () => {
      if (!selectedCustomerId && invoiceType === InvoiceType.STANDARD) {
          showToast('Customer is required for Standard Invoice', 'error');
          return;
      }
      if (items.length === 0) {
          showToast('Add at least one item', 'error');
          return;
      }

      setLoading(true);
      try {
          const customer = customers.find(c => c.id === selectedCustomerId);
          const buyer = customer ? { 
              legalName: customer.company, 
              name: customer.name, 
              vatNumber: customer.vatNumber, 
              address: customer.address 
          } : { name: 'Cash Client', isVatRegistered: false };

          await dataService.createTaxInvoice({
              type: invoiceType,
              customerId: selectedCustomerId,
              buyer,
              items,
              currency: 'SAR'
          });
          showToast(t('msg.saved'), 'success');
          navigate('/invoices');
      } catch (e) {
          showToast('Error creating invoice', 'error');
      } finally {
          setLoading(false);
      }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader 
            title={t('invoices.create')} 
            actions={
                <Button variant="ghost" onClick={() => navigate('/invoices')}>
                    <ArrowLeft size={16} className="mr-2"/> {t('back')}
                </Button>
            }
        />

        <Card>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Select label={t('invoices.type')} value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)}>
                            <option value={InvoiceType.STANDARD}>{t('invoices.standard')}</option>
                            <option value={InvoiceType.SIMPLIFIED}>{t('invoices.simplified')}</option>
                        </Select>
                    </div>
                    <div>
                        <Select label={t('col.customer')} value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                            <option value="">-- Select Customer --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                        </Select>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-secondary/30 p-3 grid grid-cols-12 gap-2 font-bold text-xs text-text-muted">
                        <div className="col-span-4 uppercase">{t('quotations.item')}</div>
                        <div className="col-span-2 text-center uppercase">{t('col.quantity')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.unitPrice')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.vat')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.total')}</div>
                    </div>
                    <div className="divide-y divide-border">
                        {items.map((item, idx) => (
                            <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center bg-surface relative group">
                                <div className="col-span-4 flex gap-2">
                                    <select 
                                        className="w-8 bg-transparent border border-border rounded" 
                                        onChange={e => handleProductSelect(idx, e.target.value)}
                                    >
                                        <option value="">P</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input 
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1"
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        placeholder={t('quotations.item')}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1 text-center"
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1 text-right"
                                        value={item.unitPrice}
                                        onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 text-right text-sm text-text-muted">
                                    {item.vatAmount.toFixed(2)}
                                </div>
                                <div className="col-span-2 text-right font-bold text-sm">
                                    {item.totalAmount.toFixed(2)}
                                    <button 
                                        onClick={() => removeItem(idx)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1 rounded"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-secondary/10 border-t border-border flex justify-between items-center">
                        <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1"/> {t('btn.addLine')}</Button>
                        <div className="text-xl font-bold">
                            {t('quotations.total')}: {totalAmount.toFixed(2)} SAR
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmit} loading={loading} size="lg">
                        <Save size={18} className="mr-2"/> {t('btn.generateInvoice')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
};

export default InvoiceForm;
