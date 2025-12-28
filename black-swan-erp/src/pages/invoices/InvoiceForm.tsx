
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { customerRepository } from '../../data/customerRepository';
import { productRepository } from '../../data/productRepository';
import { useInvoices } from '../../domain/hooks/useInvoices';
import { newInvoiceLine } from '../../domain/invoices/invoiceCalculator';
import { Customer, InvoiceDraftInput, InvoiceLineInput, InvoiceType, Product } from '../../shared/types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';

const InvoiceForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
    const { createInvoice, addLine, applyLineUpdate, deleteLine, calculateTotals } = useInvoices();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.STANDARD);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [items, setItems] = useState<InvoiceLineInput[]>([newInvoiceLine()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
        const loadLookups = async () => {
            try {
                const [customerList, productList] = await Promise.all([
                    customerRepository.list(),
                    productRepository.list(),
                ]);
                setCustomers(customerList);
                setProducts(productList);
            } catch (error) {
                console.error(error);
                showToast(t('invoice.error.references'), 'error');
            }
        };

        loadLookups();
  }, []);

    const addItem = () => setItems((prev) => addLine(prev));

    const updateItem = (index: number, patch: Partial<InvoiceLineInput>) => {
        setItems((prev) => applyLineUpdate(prev, index, patch));
    };

    const removeItem = (index: number) => {
        setItems((prev) => deleteLine(prev, index));
    };

    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            setItems((prev) => {
                const withDescription = applyLineUpdate(prev, index, { productId, description: product.name });
                const defaultPrice = product.sizes?.[0]?.price ?? 0;
                return applyLineUpdate(withDescription, index, { unitPrice: defaultPrice });
            });
        }
    };

    const buyer = useMemo(() => {
        const customer = customers.find((c) => c.id === selectedCustomerId);
        if (!customer) return { name: t('invoice.cashClient'), isVatRegistered: false };
        return {
            name: customer.company || customer.name,
            legalName: customer.company,
            vatNumber: customer.vatNumber,
            address: customer.address,
            isVatRegistered: Boolean(customer.vatNumber),
        };
    }, [customers, selectedCustomerId]);

    const draft: InvoiceDraftInput = useMemo(
        () => ({
            customerId: selectedCustomerId || undefined,
            buyer,
            items,
            currency: 'SAR',
            type: invoiceType,
        }),
        [buyer, invoiceType, items, selectedCustomerId],
    );

    const totals = useMemo(() => calculateTotals(draft), [calculateTotals, draft]);

    const handleSubmit = async () => {
        if (!selectedCustomerId && invoiceType === InvoiceType.STANDARD) {
            showToast(t('invoice.error.customerRequired'), 'error');
            return;
        }
        if (items.length === 0) {
            showToast(t('invoice.error.minItems'), 'error');
            return;
        }

        setLoading(true);
        try {
            await createInvoice(draft);
            showToast(t('msg.saved'), 'success');
            navigate('/invoices');
        } catch (error) {
            console.error(error);
            showToast(t('invoice.error.createFailed'), 'error');
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader 
            title={t('invoices.create')} 
        />

        <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('invoice.status.label')}</span>
            <span className="px-2 py-1 rounded-full bg-secondary text-text">{t('invoice.status.draft')}</span>
        </div>

        <Card>
            <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{t('invoice.section.info')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Select label={t('invoices.type')} value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)}>
                                <option value={InvoiceType.STANDARD}>{t('invoices.standard')}</option>
                                <option value={InvoiceType.SIMPLIFIED}>{t('invoices.simplified')}</option>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{t('invoice.section.customer')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Select label={t('col.customer')} value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                                <option value="">{t('invoice.customer.selectPlaceholder')}</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{t('invoice.section.items')}</h2>
                    <div className="border rounded-lg overflow-hidden">
                    <div className="bg-secondary/30 p-3 grid grid-cols-12 gap-2 font-bold text-xs text-text-muted">
                        <div className="col-span-4 uppercase">{t('quotations.item')}</div>
                        <div className="col-span-2 text-center uppercase">{t('col.quantity')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.unitPrice')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.vat')}</div>
                        <div className="col-span-2 text-right uppercase">{t('quotations.total')}</div>
                    </div>
                    <div className="divide-y divide-border">
                        {items.map((item, idx) => {
                          const computed = totals.items[idx];
                          return (
                            <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center bg-surface relative group">
                                <div className="col-span-4 flex gap-2">
                                    <select 
                                        className="w-8 bg-transparent border border-border rounded" 
                                        onChange={e => handleProductSelect(idx, e.target.value)}
                                    >
                                        <option value="">{t('invoice.item.productShort')}</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input 
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1"
                                        value={item.description}
                                        onChange={e => updateItem(idx, { description: e.target.value })}
                                        placeholder={t('quotations.item')}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1 text-center"
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number"
                                        className="w-full bg-transparent border border-border rounded text-sm px-2 py-1 text-right"
                                        value={item.unitPrice}
                                        onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2 text-right text-sm text-text-muted">
                                    {computed ? computed.vatAmount.toFixed(2) : '0.00'}
                                </div>
                                <div className="col-span-2 text-right font-bold text-sm">
                                    {computed ? computed.totalAmount.toFixed(2) : '0.00'}
                                    <button 
                                        onClick={() => removeItem(idx)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 p-1 rounded"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="p-3 bg-secondary/10 border-t border-border flex justify-between items-center">
                        <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1"/> {t('btn.addLine')}</Button>
                        <div className="text-xl font-bold">
                            {t('quotations.total')}: {totals.totalAmount.toFixed(2)} {t('currency')}
                        </div>
                    </div>
                </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{t('invoice.section.totals')}</h2>
                    <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                        <span className="text-sm text-text-muted">{t('quotations.total')}</span>
                        <span className="text-lg font-bold text-text">{totals.totalAmount.toFixed(2)} {t('currency')}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" onClick={() => navigate('/invoices')}>
                        <ArrowLeft size={16} className="mr-2"/> {t('invoice.action.back')}
                    </Button>
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
