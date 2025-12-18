
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { 
  Contract, ContractStatus, Role, ContractParty, PaymentTerm, 
  PaymentAmountType, PaymentStatus, PaymentTrigger, ContractClause, DeliveryNote, Customer, Disbursement
} from '../types';
import { 
  FileSignature, CheckCircle, Clock, AlertCircle, Plus, ChevronRight, 
  X, Building2, User, DollarSign, Calendar, FileText, ChevronLeft, Save, Send,
  PenTool, Briefcase, Mail, Truck, Printer, Search, CreditCard, TrendingDown
} from 'lucide-react';

// Default Clauses in Arabic (kept as is or could be moved to constants)
const DEFAULT_CLAUSES: ContractClause[] = [
    { id: 'c1', title: 'السرية وعدم الإفشاء', body: 'يلتزم الطرفان بالحفاظ على سرية جميع المعلومات الفنية والتجارية وعدم إفشائها لأي طرف ثالث.', enabled: true, isCustom: false },
    { id: 'c2', title: 'شروط الدفع', body: 'يجب سداد الدفعات المستحقة خلال 15 يوماً من تاريخ إصدار الفاتورة.', enabled: true, isCustom: false },
    { id: 'c3', title: 'ضمان الجودة', body: 'يضمن المورد جودة المواد والمصنعية لمدة 6 أشهر من تاريخ التسليم النهائي.', enabled: true, isCustom: false },
    { id: 'c4', title: 'حل النزاعات', body: 'يتم حل أي نزاعات تنشأ عن هذا العقد ودياً، وإذا تعذر ذلك فمن خلال المحاكم المختصة في المملكة العربية السعودية.', enabled: true, isCustom: false },
];

const Contracts: React.FC = () => {
  const { t, lang } = useTranslation();
  const { currentUserRole, showToast } = useApp();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]); 
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
        const [searchTerm, setSearchTerm] = useState('');
        const [statusFilter, setStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
        const [customerFilter, setCustomerFilter] = useState<string>('');

  const stats = useMemo(() => {
      const totalValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
      const signed = contracts.filter(c => c.status === ContractStatus.SIGNED_CLIENT).length;
      const awaiting = contracts.filter(c => c.status === ContractStatus.AWAITING_SIGNATURE).length;
      const inProduction = contracts.filter(c => c.status === ContractStatus.IN_PRODUCTION).length;
      return { total: contracts.length, totalValue, signed, awaiting, inProduction };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
      return contracts.filter(c => {
          const matchesSearch = searchTerm ? (
              (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (c.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (c.contractNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
          ) : true;
          const matchesStatus = statusFilter === 'ALL' ? true : c.status === statusFilter;
          const matchesCustomer = customerFilter ? c.clientName === customerFilter || c.clientId === customerFilter : true;
          return matchesSearch && matchesStatus && matchesCustomer;
      });
  }, [contracts, searchTerm, statusFilter, customerFilter]);
  
  // Builder Mode State
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftContract, setDraftContract] = useState<Partial<Contract>>({
      title: '', 
      totalValue: 0, 
      currency: 'SAR',
      // Default Party A (The Factory) in Arabic
      partyA: { legalName: 'مصنع البجعة السوداء للملابس الطبية', representativeName: 'المدير العام', email: 'contracts@blackswan.com.sa', address: 'الرياض، المدينة الصناعية الثانية', phone: '0110000000' },
      partyB: { legalName: '', representativeName: '', email: '', address: '' },
      paymentTerms: [],
      clauses: [...DEFAULT_CLAUSES],
      status: ContractStatus.DRAFT
  });

  // Views & Modals
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  
  // Payment Processing
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
                const [contractsRes, custData, disbs] = await Promise.all([
                        dataService.getContracts(),
                        dataService.getCustomers(),
                        dataService.getDisbursements()
                ]);

                setContracts(contractsRes.items || []);
                setCustomers(custData || []);
                setDisbursements(disbs.items || []);
        } catch (err: any) {
                console.error('Failed to load contracts', err);
                showToast(err?.message || 'تعذر تحميل العقود، الرجاء تسجيل الدخول أو المحاولة لاحقاً', 'error');
                setContracts([]);
                setCustomers([]);
                setDisbursements([]);
        } finally {
                setLoading(false);
        }
    };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const custId = e.target.value;
      setSelectedCustomerId(custId);
      const cust = customers.find(c => c.id === custId);
      if (cust) {
          setDraftContract(prev => ({
              ...prev,
              partyB: {
                  legalName: cust.company,
                  representativeName: cust.name,
                  email: cust.email,
                  phone: cust.phone,
                  address: cust.address,
                  vatNumber: cust.vatNumber
              }
          }));
      }
  };

  const handlePayMilestone = async (contractId: string, milestone: PaymentTerm) => {
      if (confirm(`Receive Payment for "${milestone.name}" amount ${milestone.amount}?`)) {
          await dataService.payMilestone(milestone.id, contractId, milestone.amount, 'Bank Transfer');
          showToast('Payment Received & Logged', 'success');
          loadData();
      }
  };

  // --- Builder Handlers ---
  const handleNext = () => setCurrentStep(p => Math.min(5, p + 1));
  const handleBack = () => setCurrentStep(p => Math.max(1, p - 1));

  const addPaymentTerm = () => {
      const newTerm: PaymentTerm = {
          id: Math.random().toString(36).substr(2, 9),
          name: `الدفعة ${(draftContract.paymentTerms?.length || 0) + 1}`,
          amountType: PaymentAmountType.PERCENTAGE,
          value: 0,
          amount: 0,
          trigger: PaymentTrigger.CUSTOM,
          status: PaymentStatus.PENDING
      };
      setDraftContract(prev => ({ ...prev, paymentTerms: [...(prev.paymentTerms || []), newTerm] }));
  };

  const removePaymentTerm = (id: string) => {
      setDraftContract(prev => ({ ...prev, paymentTerms: prev.paymentTerms?.filter(p => p.id !== id) }));
  };

  const updatePaymentTerm = (id: string, updates: Partial<PaymentTerm>) => {
      setDraftContract(prev => ({
          ...prev,
          paymentTerms: prev.paymentTerms?.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
  };

  const saveContract = async () => {
    if (!draftContract.title || !draftContract.partyB?.legalName) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }

    const totalValue = Number(draftContract.totalValue || 0);
    if (!totalValue) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }

    const paymentTerms = (draftContract.paymentTerms || []).map(term => {
        const amount = term.amountType === PaymentAmountType.PERCENTAGE
            ? Math.round(totalValue * (Number(term.value || 0) / 100))
            : Number(term.value || term.amount || 0);
        return { ...term, amount } as PaymentTerm;
    });

    const contractToSave = {
        ...draftContract,
        id: crypto.randomUUID(),
        contractNumber: `CN-${Date.now().toString().slice(-6)}`,
        clientId: selectedCustomerId || draftContract.clientId || 'manual',
        clientName: draftContract.partyB.legalName,
        createdAt: new Date().toISOString(),
        items: draftContract.items || [],
        ownerId: draftContract.ownerId || 'system',
        payment1Status: PaymentStatus.PENDING, 
        payment2Status: PaymentStatus.PENDING, 
        startDate: draftContract.startDate || new Date().toISOString().split('T')[0],
        deliveryDate: draftContract.deliveryDate || new Date().toISOString().split('T')[0],
        paymentTerms,
        status: ContractStatus.AWAITING_SIGNATURE
    } as Contract;

    try {
        setSaving(true);
        const saved = await dataService.addContract(contractToSave);
        await dataService.requestContractApproval(saved.id, saved.title, saved.totalValue);
        showToast(t('msg.saved'), 'success');
        setIsBuilderMode(false);
        setCurrentStep(1);
        setSelectedCustomerId('');
        setDraftContract(prev => ({ ...prev, title: '', partyB: { legalName: '', representativeName: '', email: '', address: '' }, paymentTerms: [], totalValue: 0 }));
        loadData();
    } catch (err: any) {
        showToast(err.message || 'Failed to save', 'error');
    } finally {
        setSaving(false);
    }
  };

  const handleSignContract = async () => {
      if (viewingContractId) {
          await dataService.markContractSignedByClient(viewingContractId, 'Signed Digitally');
          showToast(t('msg.saved'), 'success');
          setIsSignModalOpen(false);
          setViewingContractId(null);
          loadData();
      }
  };

  const handleCreateDeliveryNote = async (contractId: string) => {
      const note = await dataService.generateDeliveryNote(contractId);
      setDeliveryNote(note);
  };

  // --- Views ---

  const renderStepIndicator = () => (
      <div className="flex items-center justify-between mb-8 px-4" dir="rtl">
          {[
            {s: 1, l: 'الأطراف'}, {s: 2, l: 'التفاصيل'}, {s: 3, l: 'الدفعات'}, {s: 4, l: 'الشروط'}, {s: 5, l: 'المراجعة'}
          ].map(step => (
              <div key={step.s} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep >= step.s ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'bg-slate-200 text-slate-500'}`}>
                      {currentStep > step.s ? <CheckCircle size={18} /> : step.s}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${currentStep >= step.s ? 'text-teal-700' : 'text-slate-400'}`}>{step.l}</span>
              </div>
          ))}
          <div className="absolute top-9 left-0 w-full h-0.5 bg-slate-200 -z-0 px-10">
               <div className="h-full bg-teal-600 transition-all duration-300 float-right" style={{ width: `${(currentStep - 1) * 25}%` }}></div>
          </div>
      </div>
  );

  const renderBuilder = () => (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col" dir="rtl">
          {/* Builder Header */}
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
               <div className="flex items-center gap-4">
                    <button onClick={() => setIsBuilderMode(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight /></button>
                    <div>
                        <h2 className="text-xl font-bold">{t('contracts.builder')}</h2>
                        <p className="text-slate-400 text-sm">إنشاء مستند قانوني ملزم</p>
                    </div>
               </div>
               <div className="text-left">
                   <p className="text-xs text-slate-400 uppercase tracking-wider">رقم المسودة</p>
                   <p className="font-mono font-bold">DRAFT-NEW</p>
               </div>
          </div>

          <div className="p-8 flex-1 overflow-y-auto">
              {renderStepIndicator()}
              
              <div className="max-w-3xl mx-auto py-6">
                {currentStep === 1 && (
                    <div className="space-y-8 animate-slide-in">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Building2 size={20} className="text-teal-600"/> الطرف الأول (المزود)</h3>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="col-span-2">
                                    <label className="label">الاسم القانوني للشركة</label>
                                    <input className="input-field" placeholder="اسم المصنع / الشركة" value={draftContract.partyA?.legalName} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, legalName: e.target.value}})} />
                                 </div>
                                 <div>
                                    <label className="label">اسم الممثل</label>
                                    <input className="input-field" placeholder="الممثل النظامي" value={draftContract.partyA?.representativeName} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, representativeName: e.target.value}})} />
                                 </div>
                                 <div>
                                    <label className="label">البريد الإلكتروني (للإشعارات)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute top-3 right-3 text-slate-400"/>
                                        <input className="input-field pr-10" placeholder="email@company.com" value={draftContract.partyA?.email} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, email: e.target.value}})} />
                                    </div>
                                 </div>
                                 <div className="col-span-2">
                                     <label className="label">العنوان الوطني</label>
                                     <input className="input-field" placeholder="العنوان كاملاً" value={draftContract.partyA?.address} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, address: e.target.value}})} />
                                 </div>
                             </div>
                        </div>
                         <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                             <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2"><User size={20} className="text-indigo-600"/> الطرف الثاني (العميل)</h3>
                             
                             {/* Auto-Fill Dropdown */}
                             <div className="mb-4">
                                 <label className="label">اختر عميل حالي (تعبئة تلقائية)</label>
                                 <select className="input-field" value={selectedCustomerId} onChange={handleCustomerSelect}>
                                     <option value="">-- اختر العميل --</option>
                                     {customers.map(c => <option key={c.id} value={c.id}>{c.company} - {c.name}</option>)}
                                 </select>
                             </div>

                             <div className="grid grid-cols-2 gap-4 border-t border-indigo-200 pt-4">
                                 <div className="col-span-2">
                                    <label className="label">الاسم القانوني / العميل</label>
                                    <input className="input-field" placeholder="اسم الشركة أو العميل" value={draftContract.partyB?.legalName} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, legalName: e.target.value}})} />
                                 </div>
                                 <div>
                                    <label className="label">اسم الممثل</label>
                                    <input className="input-field" placeholder="الممثل" value={draftContract.partyB?.representativeName} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, representativeName: e.target.value}})} />
                                 </div>
                                 <div>
                                    <label className="label">البريد الإلكتروني (لإرسال العقد)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute top-3 right-3 text-slate-400"/>
                                        <input className="input-field pr-10" placeholder="client@email.com" value={draftContract.partyB?.email} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, email: e.target.value}})} />
                                    </div>
                                 </div>
                                 <div className="col-span-2">
                                     <label className="label">العنوان</label>
                                     <input className="input-field" placeholder="عنوان العميل" value={draftContract.partyB?.address} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, address: e.target.value}})} />
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6 animate-slide-in">
                        <div>
                             <label className="label">عنوان العقد / المشروع</label>
                             <input className="input-field w-full text-lg font-bold" placeholder="مثال: توريد زي موحد شتوي 2024" value={draftContract.title} onChange={e => setDraftContract({...draftContract, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="label">إجمالي قيمة العقد</label>
                                <div className="relative">
                                    <DollarSign className="absolute right-3 top-3 text-slate-400" size={18} />
                                    <input type="number" className="input-field w-full pr-10" value={draftContract.totalValue} onChange={e => setDraftContract({...draftContract, totalValue: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="label">العملة</label>
                                <select className="input-field w-full" value={draftContract.currency} onChange={e => setDraftContract({...draftContract, currency: e.target.value})}>
                                    <option value="SAR">ريال سعودي (SAR)</option>
                                    <option value="USD">دولار أمريكي (USD)</option>
                                </select>
                            </div>
                        </div>
                         <div>
                             <label className="label">وصف النطاق</label>
                             <textarea rows={4} className="input-field w-full" placeholder="وصف تفصيلي للأعمال أو المنتجات..." />
                        </div>
                    </div>
                )}

                {/* Step 3: Payments */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-slide-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">جدول الدفعات</h3>
                            <button onClick={addPaymentTerm} className="text-teal-600 text-sm font-bold flex items-center gap-1 hover:bg-teal-50 px-2 py-1 rounded transition-colors">
                                <Plus size={16}/> إضافة دفعة
                            </button>
                        </div>
                        
                        {draftContract.paymentTerms?.map((term, index) => (
                            <div key={term.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-4">
                                    <label className="label">وصف الدفعة</label>
                                    <input className="input-field" value={term.name} onChange={e => updatePaymentTerm(term.id, { name: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="label">القيمة / النسبة</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="input-field w-20" 
                                            value={term.amountType} 
                                            onChange={e => updatePaymentTerm(term.id, { amountType: e.target.value as any })}
                                        >
                                            <option value={PaymentAmountType.PERCENTAGE}>%</option>
                                            <option value={PaymentAmountType.FIXED}>SAR</option>
                                        </select>
                                        <input 
                                            type="number" 
                                            className="input-field" 
                                            value={term.value} 
                                            onChange={e => updatePaymentTerm(term.id, { value: Number(e.target.value) })} 
                                        />
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <label className="label">تستحق عند</label>
                                    <select 
                                        className="input-field"
                                        value={term.trigger}
                                        onChange={e => updatePaymentTerm(term.id, { trigger: e.target.value as any })}
                                    >
                                        <option value={PaymentTrigger.ON_SIGNING}>عند التوقيع</option>
                                        <option value={PaymentTrigger.ON_DELIVERY}>عند التسليم</option>
                                        <option value={PaymentTrigger.BEFORE_DELIVERY}>قبل التسليم</option>
                                        <option value={PaymentTrigger.AFTER_DELIVERY}>بعد التسليم</option>
                                        <option value={PaymentTrigger.CUSTOM}>تاريخ محدد</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <button onClick={() => removePaymentTerm(term.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><X size={18}/></button>
                                </div>
                            </div>
                        ))}
                        {(!draftContract.paymentTerms || draftContract.paymentTerms.length === 0) && (
                            <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                لا توجد دفعات مضافة. انقر على "إضافة دفعة" للبدء.
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Clauses */}
                {currentStep === 4 && (
                    <div className="space-y-6 animate-slide-in">
                        <h3 className="font-bold text-lg">الشروط والأحكام</h3>
                        <div className="space-y-4">
                            {draftContract.clauses?.map((clause) => (
                                <div key={clause.id} className={`p-4 rounded-xl border transition-all ${clause.enabled ? 'bg-white border-teal-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                    <div className="flex items-start gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={clause.enabled} 
                                            onChange={e => {
                                                const newClauses = draftContract.clauses?.map(c => c.id === clause.id ? { ...c, enabled: e.target.checked } : c);
                                                setDraftContract(prev => ({ ...prev, clauses: newClauses }));
                                            }}
                                            className="mt-1 w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">{clause.title}</h4>
                                            <p className="text-sm text-slate-600 mt-1">{clause.body}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                    <div className="space-y-8 animate-slide-in">
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl text-center">
                            <CheckCircle size={48} className="text-emerald-600 mx-auto mb-3" />
                            <h3 className="text-xl font-bold text-emerald-800">العقد جاهز للإنشاء</h3>
                            <p className="text-emerald-600">يرجى مراجعة التفاصيل أدناه قبل الاعتماد النهائي.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold">ملخص العقد</div>
                            <div className="p-6 grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <span className="text-slate-500 block">عنوان العقد</span>
                                    <span className="font-bold text-lg text-slate-900">{draftContract.title}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">القيمة الإجمالية</span>
                                    <span className="font-bold text-lg text-slate-900">{draftContract.totalValue?.toLocaleString()} {draftContract.currency}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">الطرف الأول</span>
                                    <span className="font-bold text-slate-900">{draftContract.partyA?.legalName}</span>
                                    <div className="text-xs text-slate-400">{draftContract.partyA?.representativeName}</div>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">الطرف الثاني</span>
                                    <span className="font-bold text-slate-900">{draftContract.partyB?.legalName}</span>
                                    <div className="text-xs text-slate-400">{draftContract.partyB?.representativeName}</div>
                                </div>
                            </div>
                            
                            {/* Milestones Summary */}
                            <div className="border-t border-slate-100 p-6">
                                <h4 className="font-bold mb-3 text-slate-700">الدفعات</h4>
                                {draftContract.paymentTerms && draftContract.paymentTerms.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                                        {draftContract.paymentTerms.map(t => (
                                            <li key={t.id}>{t.name}: {t.value}{t.amountType === PaymentAmountType.PERCENTAGE ? '%' : ' SAR'} ({t.trigger})</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-slate-400 text-sm italic">لم يتم تحديد دفعات.</p>
                                )}
                            </div>

                            {/* Clauses Summary */}
                            <div className="border-t border-slate-100 p-6">
                                <h4 className="font-bold mb-3 text-slate-700">الشروط الفعالة</h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 text-sm">
                                    {draftContract.clauses?.filter(c => c.enabled).map(c => (
                                        <li key={c.id}>{c.title}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
              </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
               <button onClick={handleBack} disabled={currentStep === 1} className="btn-secondary disabled:opacity-50">السابق</button>
               <div className="flex gap-3">
                   {currentStep < 5 ? (
                       <button onClick={handleNext} className="btn-primary flex items-center gap-2">الخطوة التالية <ChevronLeft size={16}/></button>
                   ) : (
                       <button 
                          onClick={saveContract} 
                          disabled={saving}
                          className={`bg-teal-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-teal-200 ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-700'}`}>
                            <Send size={16}/> {saving ? 'جاري الحفظ...' : 'إنشاء وإرسال'}
                       </button>
                   )}
               </div>
          </div>
      </div>
  );

  const renderList = () => (
        <div className="space-y-6">
            <div className="grid card-grid cols-2 lg:grid-cols-4">
                <div className="glass rounded-2xl p-4">
                    <p className="eyebrow">{t('col.total')}</p>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="muted text-xs mt-1">{t('contracts.title')}</p>
                </div>
                <div className="glass rounded-2xl p-4">
                    <p className="eyebrow">{t('col.amount')}</p>
                    <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()} SAR</div>
                    <p className="muted text-xs mt-1">{t('kpi.contracts')}</p>
                </div>
                <div className="glass rounded-2xl p-4">
                    <p className="eyebrow">{t('status')}</p>
                    <div className="text-2xl font-bold text-emerald-600">{stats.signed}</div>
                    <p className="muted text-xs mt-1">Signed</p>
                </div>
                <div className="glass rounded-2xl p-4">
                    <p className="eyebrow">Pipeline</p>
                    <div className="text-2xl font-bold text-amber-600">{stats.awaiting + stats.inProduction}</div>
                    <p className="muted text-xs mt-1">Awaiting / Production</p>
                </div>
            </div>

            <div className="glass rounded-2xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            className="input-field pl-9 w-64"
                            placeholder={t('search.placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="input-field w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                        <option value="ALL">{t('status')} — All</option>
                        <option value={ContractStatus.AWAITING_SIGNATURE}>Awaiting Signature</option>
                        <option value={ContractStatus.SIGNED_CLIENT}>Signed</option>
                        <option value={ContractStatus.IN_PRODUCTION}>In Production</option>
                        <option value={ContractStatus.DRAFT}>Draft</option>
                    </select>
                    <select className="input-field w-48" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                        <option value="">{t('menu.customers')}</option>
                        {customers.map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-ghost" onClick={() => {setSearchTerm(''); setStatusFilter('ALL'); setCustomerFilter('');}}>{t('btn.reset') || 'Reset'}</button>
                    {(currentUserRole === Role.MARKETING || currentUserRole === Role.CEO) && (
                        <button 
                                onClick={() => setIsBuilderMode(true)}
                                className="btn-primary"
                        >
                                <Plus size={16} /> {t('btn.create')}
                        </button>
                    )}
                </div>
            </div>

            {(() => {
                if (filteredContracts.length === 0) {
                    return (
                        <div className="glass rounded-2xl p-10 text-center space-y-3">
                            <div className="text-3xl">📝</div>
                            <h3 className="text-xl font-bold text-text">{t('noData')}</h3>
                            <p className="muted">{t('contracts.subtitle')}</p>
                            {(currentUserRole === Role.MARKETING || currentUserRole === Role.CEO) && (
                                <button onClick={() => setIsBuilderMode(true)} className="btn-primary mx-auto">{t('btn.create')}</button>
                            )}
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredContracts.map((contract) => {
                            const contractExpenses = disbursements.filter(d => d.contractId === contract.id);
                            const totalExpenses = contractExpenses.reduce((sum, d) => sum + d.amount, 0);

                            return (
                                <div key={contract.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                    <div className="p-6 cursor-pointer" onClick={() => setExpandedContractId(expandedContractId === contract.id ? null : contract.id)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        contract.status === ContractStatus.SIGNED_CLIENT ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                        contract.status === ContractStatus.AWAITING_SIGNATURE ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                                        'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {contract.status}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">{contract.contractNumber}</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900">{contract.title}</h3>
                                                <p className="text-sm text-slate-500">{contract.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-slate-900">{contract.totalValue.toLocaleString()} {contract.currency}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500" title="Provider">A</div>
                                                {(() => {
                                                    const clientSigned = [
                                                        ContractStatus.SIGNED_CLIENT,
                                                        ContractStatus.IN_PRODUCTION,
                                                        ContractStatus.READY_DELIVERY,
                                                        ContractStatus.DELIVERED,
                                                        ContractStatus.CLOSED
                                                    ].includes(contract.status);
                                                    return (
                                                        <div
                                                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white ${clientSigned ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                            title="Client"
                                                        >
                                                            B
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                 {(contract.status === ContractStatus.IN_PRODUCTION || contract.status === ContractStatus.READY_DELIVERY) && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleCreateDeliveryNote(contract.id); }}
                                                        className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-1"
                                                    >
                                                        <Truck size={14} /> {t('btn.deliveryNote')}
                                                    </button>
                                                )}

                                                {contract.status === ContractStatus.AWAITING_SIGNATURE && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setViewingContractId(contract.id); setIsSignModalOpen(true); }}
                                                        className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                                                    >
                                                        <PenTool size={12} /> {t('btn.sign')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Financials & Milestones */}
                                    {expandedContractId === contract.id && (
                                        <div className="border-t border-slate-100 bg-slate-50 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div>
                                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={16}/> {t('contracts.milestones')}</h4>
                                                <table className="w-full text-sm text-left bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                    <thead className="bg-slate-100 text-slate-500">
                                                        <tr>
                                                            <th className="p-3">{t('col.title')}</th>
                                                            <th className="p-3 text-right">{t('col.amount')}</th>
                                                            <th className="p-3 text-center">{t('status')}</th>
                                                            <th className="p-3 text-center">{t('actions')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {contract.paymentTerms?.map((term, idx) => (
                                                            <tr key={term.id || idx}>
                                                                <td className="p-3 font-medium">{term.name}</td>
                                                                <td className="p-3 text-right font-bold">{term.amount.toLocaleString()}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                                        term.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                                    }`}>
                                                                        {term.status}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {term.status === PaymentStatus.PENDING && (
                                                                        <button 
                                                                            onClick={() => handlePayMilestone(contract.id, term)}
                                                                            className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold hover:bg-slate-800 flex items-center gap-1 mx-auto"
                                                                        >
                                                                            <CreditCard size={12}/> {t('btn.pay')}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {/* Contract Related Expenses */}
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingDown size={16}/> {t('contracts.relatedExpenses')}</h4>
                                                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">Total: -{totalExpenses.toLocaleString()}</span>
                                                </div>
                                                <table className="w-full text-sm text-left bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                    <thead className="bg-slate-100 text-slate-500">
                                                        <tr>
                                                            <th className="p-3">{t('col.date')}</th>
                                                            <th className="p-3">{t('lbl.category')}</th>
                                                            <th className="p-3 text-right">{t('col.amount')}</th>
                                                            <th className="p-3 text-center">{t('status')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {contractExpenses.map((exp) => (
                                                            <tr key={exp.id}>
                                                                <td className="p-3 text-slate-500">{exp.date}</td>
                                                                <td className="p-3 font-medium">{exp.category}</td>
                                                                <td className="p-3 text-right font-bold text-red-600">-{exp.amount.toLocaleString()}</td>
                                                                <td className="p-3 text-center text-xs text-slate-500">{exp.approvalStatus}</td>
                                                            </tr>
                                                        ))}
                                                        {contractExpenses.length === 0 && (
                                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400 text-xs">No expenses recorded.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
  );

  return (
    <>
        {loading ? (
             <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        ) : isBuilderMode ? renderBuilder() : renderList()}

        {/* Client Signature Modal Simulation */}
        {isSignModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                         <h3 className="font-bold flex items-center gap-2"><Briefcase className="text-indigo-600"/> بوابة العملاء</h3>
                         <button onClick={() => setIsSignModalOpen(false)}><X size={20}/></button>
                     </div>
                     <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
                         <div className="bg-white shadow-lg p-8 min-h-[500px] flex items-center justify-center flex-col text-center border">
                             <h2 className="font-serif text-2xl font-bold mb-4">اتفاقية خدمات</h2>
                             <p className="text-slate-500 max-w-md mb-8">يرجى مراجعة شروط العقد. بالنقر على التوقيع، فإنك توافق قانونياً على جميع الشروط الواردة في هذا المستند الرقمي.</p>
                             
                             <button 
                                onClick={handleSignContract}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                             >
                                 <PenTool size={20} /> توقيع إلكتروني
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        )}
        
        {/* Delivery Note Modal */}
        {deliveryNote && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     {/* Print View Implementation */}
                     <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                         <h3 className="font-bold flex items-center gap-2"><Truck className="text-teal-600"/> {t('btn.deliveryNote')}</h3>
                         <button onClick={() => setDeliveryNote(null)}><X size={20}/></button>
                     </div>
                     <div className="p-8 bg-white flex-1 overflow-auto">
                         <h1 className="text-2xl font-bold mb-4">Delivery Note: {deliveryNote.id}</h1>
                         <p className="mb-4">Client: {deliveryNote.clientName}</p>
                         <table className="w-full border">
                             <thead><tr className="bg-gray-100"><th className="p-2 border">Item</th><th className="p-2 border">Qty</th></tr></thead>
                             <tbody>
                                 {deliveryNote.items.map((i, idx) => (
                                     <tr key={idx}><td className="p-2 border">{i.productName}</td><td className="p-2 border">{i.quantity}</td></tr>
                                 ))}
                             </tbody>
                         </table>
                         <button onClick={() => window.print()} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded">{t('btn.print')}</button>
                     </div>
                 </div>
            </div>
        )}

        <style>{`
            .input-field {
                @apply w-full border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm py-2.5;
            }
            .label {
                @apply block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5;
            }
            .btn-primary {
                @apply bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-all text-sm;
            }
            .btn-secondary {
                @apply bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition-all text-sm;
            }
        `}</style>
    </>
  );
};

export default Contracts;
