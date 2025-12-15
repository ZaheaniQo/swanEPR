
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Quotation, QuotationItem, Customer, Product, ProductSize } from '../types';
import { Plus, Printer, FileText, ArrowRightCircle, Trash2, Send, Tag, ChevronDown } from 'lucide-react';
import { useLayoutEffect } from 'react';

const Quotations: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewState, setViewState] = useState<'LIST' | 'CREATE' | 'VIEW'>('LIST');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Form State
  const [newQuotation, setNewQuotation] = useState<Partial<Quotation>>({
      customerName: '', customerCompany: '', customerPhone: '', customerEmail: '',
      date: new Date().toISOString().split('T')[0],
      items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getQuotations();
    const custData = await dataService.getCustomers();
    const prodData = await dataService.getProducts();
    setQuotations(data);
    setCustomers(custData);
    setProducts(prodData);
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const custId = e.target.value;
      const cust = customers.find(c => c.id === custId);
      if (cust) {
          setNewQuotation(prev => ({
              ...prev,
              customerName: cust.name,
              customerCompany: cust.company,
              customerPhone: cust.phone,
              customerEmail: cust.email
          }));
      }
  };

  const addItem = () => {
      const item: QuotationItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: '', quantity: 1, unitPrice: 0, total: 0
      };
      setNewQuotation(prev => ({ ...prev, items: [...(prev.items || []), item] }));
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
      setNewQuotation(prev => {
          const items = prev.items?.map(item => {
              if (item.id === id) {
                  const updated = { ...item, [field]: value };
                  updated.total = updated.quantity * updated.unitPrice;
                  return updated;
              }
              return item;
          });
          return { ...prev, items };
      });
  };

  const handleProductSelect = (itemId: string, productId: string) => {
      const product = products.find(p => p.id === productId);
      if (product) {
          updateItem(itemId, 'productId', productId);
          updateItem(itemId, 'description', product.name);
          updateItem(itemId, 'sizeId', undefined);
      } else {
          updateItem(itemId, 'productId', undefined);
      }
  };

  const handleSizeSelect = (itemId: string, sizeId: string) => {
      const item = newQuotation.items?.find(i => i.id === itemId);
      if (!item || !item.productId) return;

      const product = products.find(p => p.id === item.productId);
      const size = product?.sizes.find(s => s.id === sizeId);

      if (size) {
          updateItem(itemId, 'sizeId', sizeId);
          updateItem(itemId, 'unitPrice', size.price);
          updateItem(itemId, 'description', `${product!.name} - ${size.size}`);
      }
  };

  const removeItem = (id: string) => {
      setNewQuotation(prev => ({ ...prev, items: prev.items?.filter(i => i.id !== id) }));
  };

  const calculateTotals = () => {
      const subtotal = newQuotation.items?.reduce((s, i) => s + i.total, 0) || 0;
      const vat = subtotal * 0.15;
      return { subtotal, vat, total: subtotal + vat };
  };

  const handleSave = async () => {
      if (!newQuotation.customerName || !newQuotation.items?.length) {
          showToast('Please fill required fields', 'error');
          return;
      }
      const totals = calculateTotals();
      const quotation: Quotation = {
          ...newQuotation as Quotation,
          id: Math.random().toString(36).substr(2, 9),
          quotationNumber: `QT-${Date.now().toString().substr(-6)}`,
          subtotal: totals.subtotal,
          vatAmount: totals.vat,
          totalAmount: totals.total,
          status: 'PENDING',
          expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      };
      await dataService.addQuotation(quotation);
      showToast(t('msg.quotationCreated'), 'success');
      setViewState('LIST');
      loadData();
  };

  const handleConvert = async (id: string) => {
      const contract = await dataService.convertQuotationToContract(id);
      if (contract) {
        showToast('Quotation converted to Contract Draft', 'success');
        // Ideally we would use router history here, but we'll reload data
        loadData();
        // Force navigate (Assuming parent handles navigation or user manually goes to contracts)
        window.location.hash = 'contracts'; // Hacky simple nav or just notify
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('quotations.title')}</h1>
                <p className="text-slate-500">Create and manage price proposals.</p>
            </div>
            {viewState === 'LIST' && (
                <button onClick={() => { setNewQuotation({ customerName: '', date: new Date().toISOString().split('T')[0], items: [] }); setViewState('CREATE'); }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> {t('btn.create')}
                </button>
            )}
       </div>

       {viewState === 'LIST' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {quotations.map(q => (
                   <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-4">
                           <div>
                               <h3 className="font-bold text-slate-800">{q.quotationNumber}</h3>
                               <p className="text-sm text-slate-500">{q.customerCompany || q.customerName}</p>
                           </div>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${q.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                               {q.status}
                           </span>
                       </div>
                       <p className="text-2xl font-bold text-slate-900 mb-4">{q.totalAmount.toLocaleString()} SAR</p>
                       <div className="flex gap-2">
                           <button onClick={() => { setSelectedQuotation(q); setViewState('VIEW'); }} className="flex-1 btn-secondary text-xs">View</button>
                           {q.status === 'PENDING' && (
                               <button onClick={() => handleConvert(q.id)} className="flex-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700">Convert</button>
                           )}
                       </div>
                   </div>
               ))}
           </div>
       )}

       {viewState === 'CREATE' && (
           <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
               <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                   <h3 className="font-bold">New Quotation</h3>
                   <button onClick={() => setViewState('LIST')} className="text-slate-400 hover:text-red-500"><Trash2 size={20}/></button>
               </div>
               <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                       <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Select Customer (Auto-fill)</label>
                            <select className="input-field" onChange={handleCustomerSelect}>
                                <option value="">-- Existing Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                            </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name</label>
                           <input className="input-field" value={newQuotation.customerName} onChange={e => setNewQuotation({...newQuotation, customerName: e.target.value})} />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Company</label>
                           <input className="input-field" value={newQuotation.customerCompany} onChange={e => setNewQuotation({...newQuotation, customerCompany: e.target.value})} />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                           <input type="date" className="input-field" value={newQuotation.date} onChange={e => setNewQuotation({...newQuotation, date: e.target.value})} />
                       </div>
                   </div>

                   <div>
                       <div className="flex justify-between items-center mb-2">
                           <h4 className="font-bold text-slate-700">Items</h4>
                           <button onClick={addItem} className="text-teal-600 text-xs font-bold flex items-center gap-1"><Plus size={14}/> Add Item</button>
                       </div>
                       <table className="w-full text-sm text-left border">
                           <thead className="bg-slate-50 text-slate-500">
                               <tr>
                                   <th className="p-2 w-1/4">Product</th>
                                   <th className="p-2 w-1/5">Size / Detail</th>
                                   <th className="p-2">Description (Override)</th>
                                   <th className="p-2 w-16">Qty</th>
                                   <th className="p-2 w-24">Unit Price</th>
                                   <th className="p-2 w-24">Total</th>
                                   <th className="p-2 w-10"></th>
                               </tr>
                           </thead>
                           <tbody>
                               {newQuotation.items?.map(item => {
                                   const selectedProduct = products.find(p => p.id === item.productId);
                                   return (
                                   <tr key={item.id} className="border-t bg-white">
                                       <td className="p-2">
                                           <select 
                                                className="w-full bg-transparent border border-slate-200 rounded text-xs py-1" 
                                                value={item.productId || ''} 
                                                onChange={e => handleProductSelect(item.id, e.target.value)}
                                           >
                                               <option value="">-- Custom Item --</option>
                                               {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                           </select>
                                       </td>
                                       <td className="p-2">
                                            {selectedProduct ? (
                                                <select 
                                                    className="w-full bg-transparent border border-slate-200 rounded text-xs py-1"
                                                    value={item.sizeId || ''}
                                                    onChange={e => handleSizeSelect(item.id, e.target.value)}
                                                >
                                                    <option value="">-- Size --</option>
                                                    {selectedProduct.sizes.map(s => <option key={s.id} value={s.id}>{s.size} ({s.price} SAR)</option>)}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-slate-300">N/A</span>
                                            )}
                                       </td>
                                       <td className="p-2"><input className="w-full bg-transparent text-xs" placeholder="Item name" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></td>
                                       <td className="p-2"><input type="number" className="w-full bg-transparent border-b border-slate-200" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></td>
                                       <td className="p-2"><input type="number" className="w-full bg-transparent border-b border-slate-200" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></td>
                                       <td className="p-2 font-bold">{item.total.toLocaleString()}</td>
                                       <td className="p-2"><button onClick={() => removeItem(item.id)} className="text-red-400"><Trash2 size={16}/></button></td>
                                   </tr>
                               )})}
                           </tbody>
                       </table>
                       <div className="flex justify-end mt-4 text-right">
                           <div className="w-48 space-y-2">
                               <div className="flex justify-between text-sm"><span>Subtotal:</span> <span>{calculateTotals().subtotal.toLocaleString()}</span></div>
                               <div className="flex justify-between text-sm"><span>VAT (15%):</span> <span>{calculateTotals().vat.toLocaleString()}</span></div>
                               <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span> <span>{calculateTotals().total.toLocaleString()}</span></div>
                           </div>
                       </div>
                   </div>
               </div>
               <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                   <button onClick={() => setViewState('LIST')} className="btn-secondary">Cancel</button>
                   <button onClick={handleSave} className="btn-primary">Save Quotation</button>
               </div>
           </div>
       )}

        {viewState === 'VIEW' && selectedQuotation && (
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl mx-auto border border-slate-200">
                <div className="flex justify-between items-start mb-8 border-b pb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Quotation</h1>
                        <p className="text-slate-500">{selectedQuotation.quotationNumber}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">Black Swan Factory</p>
                        <p className="text-slate-500">Riyadh, Saudi Arabia</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-xs uppercase text-slate-400 font-bold mb-1">Bill To</p>
                        <p className="font-bold text-lg">{selectedQuotation.customerCompany || selectedQuotation.customerName}</p>
                        <p>{selectedQuotation.customerPhone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-slate-400 font-bold mb-1">Date</p>
                        <p className="font-bold">{selectedQuotation.date}</p>
                        <p className="text-xs text-slate-400 mt-2">Valid until {selectedQuotation.expiryDate}</p>
                    </div>
                </div>

                <table className="w-full text-left mb-8">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Price</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedQuotation.items.map((item, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold">{item.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-12">
                     <div className="w-64 space-y-2">
                        <div className="flex justify-between"><span>Subtotal</span> <span>{selectedQuotation.subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>VAT (15%)</span> <span>{selectedQuotation.vatAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold text-xl border-t pt-2 text-slate-900"><span>Total</span> <span>{selectedQuotation.totalAmount.toLocaleString()} SAR</span></div>
                    </div>
                </div>

                <div className="flex justify-between items-center no-print">
                    <button onClick={() => setViewState('LIST')} className="text-slate-500 hover:text-slate-800">Back to List</button>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2"><Printer size={16}/> Print</button>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Send size={16}/> Email</button>
                        {selectedQuotation.status === 'PENDING' && (
                             <button onClick={() => { handleConvert(selectedQuotation.id); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-200">
                                <ArrowRightCircle size={16}/> Convert to Contract
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        <style>{`
            .input-field {
                @apply w-full border-slate-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500;
            }
        `}</style>
    </div>
  );
};

export default Quotations;
