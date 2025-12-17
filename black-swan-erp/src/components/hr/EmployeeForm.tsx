
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Employee, Role } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Save, Trash2, ArrowLeft, Plus, Upload, AlertTriangle, FileText } from 'lucide-react';

const EmployeeForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Employee>>({
      name: '',
      role: '',
      department: '',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      contractDurationDays: 365,
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      annualLeaveBalance: 21,
      nationality: '',
      nationalId: '',
      phone: '',
      email: '',
      iban: '',
      contractType: 'Full-time',
    systemRole: Role.EMPLOYEE
  });
  const [loading, setLoading] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [customNationality, setCustomNationality] = useState('');
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [newSalary, setNewSalary] = useState({ basic: 0, housing: 0, transport: 0, other: 0, gosi: 0, effective: new Date().toISOString().split('T')[0] });
    const [leaves, setLeaves] = useState<any[]>([]);
    const [files, setFiles] = useState<{name:string;url:string;path:string;}[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [autoSaving, setAutoSaving] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isEdit && id) {
        loadEmployee(id);
    }
  }, [id]);

    useEffect(() => {
        if (isEdit && id) {
            loadSalary(id);
            loadLeaves(id);
            loadFiles(id);
            loadAudit(id);
        }
    }, [isEdit, id]);

    // Auto-save on edit with debounce
    useEffect(() => {
        if (!isEdit || !id) return;
        const timer = setTimeout(async () => {
            setAutoSaving(true);
            try {
                await dataService.updateEmployee(id, formData as Employee);
            } catch (e:any) {
                console.warn('autosave', e?.message);
            } finally {
                setAutoSaving(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData, isEdit, id]);

  const loadEmployee = async (empId: string) => {
      const found = await dataService.getEmployeeById(empId);
      if (found) setFormData(prev => ({ ...prev, ...found }));
  };

    const loadSalary = async (empId: string) => {
            const list = await dataService.getSalaryHistory(empId);
            setSalaryHistory(list);
    };

    const loadLeaves = async (empId: string) => {
            const list = await dataService.getEmployeeLeaves(empId);
            setLeaves(list);
    };

    const loadFiles = async (empId: string) => {
            try {
                const list = await dataService.listEmployeeFiles(empId);
                setFiles(list);
            } catch (e:any) {
                console.warn('files', e?.message);
            }
    };

    const loadAudit = async (empId: string) => {
            try {
                const list = await dataService.getEmployeeAudit(empId);
                setAuditLogs(list);
            } catch (e:any) {
                console.warn('audit', e?.message);
            }
    };

    const nationalityOptions = [
        'السعودية',
        'مصر',
        'الأردن',
        'اليمن',
        'السودان',
        'سوريا',
        'لبنان',
        'فلسطين',
        'المغرب',
        'تونس',
        'الجزائر',
        'باكستان',
        'الهند',
        'بنغلاديش',
        'الفلبين',
        'Other'
    ];

    const selectedNationality = formData.nationality || '';
    const showPassportExpiry = selectedNationality && selectedNationality !== 'السعودية' && selectedNationality !== 'Saudi Arabia';

    const contractEndDate = React.useMemo(() => {
        if (!formData.joinDate || !formData.contractDurationDays) return '';
        const start = new Date(formData.joinDate);
        const end = new Date(start);
        end.setDate(end.getDate() + Number(formData.contractDurationDays));
        return end.toISOString().split('T')[0];
    }, [formData.joinDate, formData.contractDurationDays]);

    const totalSalary = React.useMemo(() => (Number(formData.basicSalary || 0) + Number(formData.housingAllowance || 0) + Number(formData.transportAllowance || 0) + Number(formData.otherAllowances || 0)), [formData.basicSalary, formData.housingAllowance, formData.transportAllowance, formData.otherAllowances]);

  const handleSave = async () => {
      if (!formData.name || !formData.nationalId) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      if (createAccount && (!formData.email || !formData.systemRole)) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }

      const nationalityValue = selectedNationality === 'Other' ? customNationality : selectedNationality;
      if (selectedNationality === 'Other' && !customNationality) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }

      setLoading(true);
      try {
          if (isEdit && id) {
              await dataService.updateEmployee(id, { ...formData, nationality: nationalityValue });
              showToast(t('msg.saved'), 'success');
          } else {
              await dataService.addEmployee({ ...formData, nationality: nationalityValue, systemRole: formData.systemRole } as Employee);
              showToast(t('msg.saved'), 'success');
          }
          navigate('/hr');
      } catch (e: any) {
          showToast(e?.message || 'Error saving employee', 'error');
      } finally {
          setLoading(false);
      }
  };

    const daysUntil = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        const today = new Date();
        return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

  return (
        <div className="max-w-6xl mx-auto space-y-6">
                <PageHeader 
                        title={isEdit ? t('hr.editEmployee') : t('hr.addEmployee')} 
                        subtitle={autoSaving ? 'حفظ تلقائي...' : ''}
                        actions={
                                <div className="flex gap-2">
                                    {isEdit && (
                                        <Button variant="outline" onClick={async () => {
                                            const ok = window.confirm('حذف الموظف نهائياً؟');
                                            if (!ok || !id) return;
                                            await dataService.deleteEmployee(id);
                                            showToast('تم الحذف', 'success');
                                            navigate('/hr');
                                        }}>
                                            <Trash2 size={16} className="mr-2"/> حذف
                                        </Button>
                                    )}
                                    <Button variant="ghost" onClick={() => navigate('/hr')}>
                                            <ArrowLeft size={16} className="mr-2"/> {t('back')}
                                    </Button>
                                </div>
                        }
                />

                {/* Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[{label:'انتهاء العقد', days: daysUntil(contractEndDate)}, {label:'انتهاء الإقامة', days: daysUntil(formData.iqamaExpiry)}, {label:'انتهاء الجواز', days: daysUntil(formData.passportExpiry)}]
                        .filter(a => a.days !== undefined && a.days <= 90)
                        .map((a, idx) => (
                            <div key={idx} className={`p-3 rounded-lg flex items-center gap-3 ${a.days !== undefined && a.days <=0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                <AlertTriangle size={18}/>
                                <div className="text-sm font-semibold">{a.label}: {a.days} يوم</div>
                            </div>
                        ))}
                </div>

                <Card>
                        <CardContent className="p-8 space-y-8">
                                {/* Personal Info */}
                                <div>
                                        <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.personalInfo')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input label={t('hr.fullName')} value={formData.name ?? ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                                <Input label={t('hr.nationalId')} value={formData.nationalId ?? ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                                                <Select label={t('hr.nationality')} value={selectedNationality} onChange={e => {
                                                                const val = e.target.value;
                                                                setFormData({ ...formData, nationality: val === 'Other' ? '' : val });
                                                                if (val !== 'Other') setCustomNationality('');
                                                }}>
                                                                <option value="">اختر الجنسية</option>
                                                                {nationalityOptions.map(n => (
                                                                        <option key={n} value={n}>{n}</option>
                                                                ))}
                                                </Select>
                                                {selectedNationality === 'Other' && (
                                                        <Input label="جنسية أخرى" value={customNationality} onChange={e => setCustomNationality(e.target.value)} />
                                                )}
                                                <Input label={t('hr.phone')} value={formData.phone ?? ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                                <Input label={t('hr.email')} type="email" value={formData.email ?? ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                                <Input label={t('hr.joined')} type="date" value={formData.joinDate ?? ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-sm text-text">الصورة/الأفاتار</label>
                                                    <div className="flex items-center gap-3">
                                                        <img src={avatarPreview || formData.avatarUrl || 'https://placehold.co/80x80'} alt="avatar" className="w-16 h-16 rounded-full object-cover border" />
                                                        <label className="cursor-pointer px-3 py-2 rounded border bg-secondary/50 flex items-center gap-2 text-sm">
                                                            <Upload size={14}/> رفع
                                                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file || !id) return;
                                                                setAvatarPreview(URL.createObjectURL(file));
                                                                try {
                                                                    const url = await dataService.uploadEmployeeFile(id, file);
                                                                    setFormData({ ...formData, avatarUrl: url });
                                                                    await dataService.updateEmployee(id, { avatarUrl: url });
                                                                    showToast('تم تحديث الصورة', 'success');
                                                                    await loadFiles(id);
                                                                } catch (err:any) {
                                                                    showToast(err?.message || 'فشل رفع الصورة', 'error');
                                                                }
                                                            }} />
                                                        </label>
                                                    </div>
                                                </div>
                                        </div>
                                </div>

                                {/* Employment */}
                                <div>
                                        <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.employmentDetails')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Input label={t('hr.jobTitle')} value={formData.role ?? ''} onChange={e => setFormData({...formData, role: e.target.value})} />
                        <Select label={t('hr.systemRole') || 'System Role'} value={formData.systemRole ?? Role.EMPLOYEE} onChange={e => setFormData({...formData, systemRole: e.target.value as Role})}>
                                                    <option value={Role.SUPER_ADMIN}>Super Admin</option>
                                                    <option value={Role.CEO}>CEO</option>
                                                    <option value={Role.MARKETING}>Marketing</option>
                                                    <option value={Role.WAREHOUSE}>Warehouse</option>
                                                    <option value={Role.ACCOUNTING}>Accounting</option>
                                                    <option value={Role.HR}>HR</option>
                                                    <option value={Role.PRODUCTION_MANAGER}>Production Manager</option>
                                                    <option value={Role.PARTNER}>Partner</option>
                                                    <option value={Role.EMPLOYEE}>Employee</option>
                                                </Select>
                                                <Select label={t('hr.department')} value={formData.department ?? ''} onChange={e => setFormData({...formData, department: e.target.value})}>
                                                        <option value="">Select Dept</option>
                                                        <option value="Production">Production</option>
                                                        <option value="Sales">Sales</option>
                                                        <option value="HR">HR</option>
                                                        <option value="Finance">Finance</option>
                                                        <option value="Management">Management</option>
                                                </Select>
                                                <Select label={t('hr.status')} value={formData.status ?? 'Active'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                                        <option value="Active">Active</option>
                                                        <option value="On Leave">On Leave</option>
                                                        <option value="Terminated">Terminated</option>
                                                </Select>
                                                <Select label={t('hr.contractType')} value={formData.contractType ?? 'Full-time'} onChange={e => setFormData({...formData, contractType: e.target.value as any})}>
                                                        <option value="Full-time">Full-time</option>
                                                        <option value="Part-time">Part-time</option>
                                                        <option value="Contractor">Contractor</option>
                                                </Select>
                                                <Input label={t('hr.iban')} value={formData.iban ?? ''} onChange={e => setFormData({...formData, iban: e.target.value})} />
                                                <Input label="مدة العقد (أيام)" type="number" value={formData.contractDurationDays ?? 0} onChange={e => setFormData({...formData, contractDurationDays: Number(e.target.value)})} />
                                                <Input label="تاريخ انتهاء العقد" type="date" value={contractEndDate ?? ''} onChange={() => {}} disabled />
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={!!formData.disabled} onChange={e => setFormData({ ...formData, disabled: e.target.checked })} />
                                                    <span className="text-sm">تعطيل دخول الحساب</span>
                                                </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                                <Input label="تاريخ انتهاء الإقامة" type="date" value={formData.iqamaExpiry ?? ''} onChange={e => setFormData({ ...formData, iqamaExpiry: e.target.value })} />
                                                {showPassportExpiry && (
                                                    <Input label="تاريخ انتهاء الجواز" type="date" value={formData.passportExpiry ?? ''} onChange={e => setFormData({ ...formData, passportExpiry: e.target.value })} />
                                                )}
                                                <Input label="ملاحظات إدارية" value={formData.adminNotes ?? ''} onChange={e => setFormData({ ...formData, adminNotes: e.target.value })} />
                                        </div>
                                        <div className="mt-4 flex items-center gap-3 bg-secondary/30 p-3 rounded">
                                            <input type="checkbox" id="createAccount" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} className="h-4 w-4" />
                                            <label htmlFor="createAccount" className="text-sm text-text">إنشاء مستخدم وإرسال رابط تعيين كلمة المرور لهذا البريد (بدون كلمات سر افتراضية)</label>
                                        </div>
                                </div>

                                {/* Payroll */}
                                <div>
                                        <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.financialPackage')}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <Input label={t('hr.basic')} type="number" value={formData.basicSalary ?? 0} onChange={e => setFormData({...formData, basicSalary: Number(e.target.value)})} />
                                                <Input label={t('hr.housing')} type="number" value={formData.housingAllowance ?? 0} onChange={e => setFormData({...formData, housingAllowance: Number(e.target.value)})} />
                                                <Input label={t('hr.transport')} type="number" value={formData.transportAllowance ?? 0} onChange={e => setFormData({...formData, transportAllowance: Number(e.target.value)})} />
                                                <Input label={t('hr.other')} type="number" value={formData.otherAllowances ?? 0} onChange={e => setFormData({...formData, otherAllowances: Number(e.target.value)})} />
                                        </div>
                                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-semibold">
                                            الإجمالي: {totalSalary.toLocaleString()} SAR
                                        </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                        <Button onClick={handleSave} loading={loading} size="lg">
                                                <Save size={18} className="mr-2"/> {t('btn.save')}
                                        </Button>
                                </div>
                        </CardContent>
                </Card>

                {/* Salary history & leaves */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>سجل الرواتب</CardTitle>
                            {isEdit && <Button size="sm" variant="outline" onClick={() => setShowSalaryModal(true)} className="flex items-center gap-1"><Plus size={14}/> إضافة راتب</Button>}
                        </CardHeader>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary text-text-muted uppercase text-xs">
                                    <tr>
                                        <th className="px-3 py-2">تاريخ السريان</th>
                                        <th className="px-3 py-2">أساسي</th>
                                        <th className="px-3 py-2">بدل سكن</th>
                                        <th className="px-3 py-2">نقل</th>
                                        <th className="px-3 py-2">أخرى</th>
                                        <th className="px-3 py-2">GOSI%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {salaryHistory.map((s:any) => (
                                        <tr key={s.id}>
                                            <td className="px-3 py-2">{s.effectiveDate}</td>
                                            <td className="px-3 py-2 font-mono">{s.basicSalary}</td>
                                            <td className="px-3 py-2 font-mono">{s.housingAllowance}</td>
                                            <td className="px-3 py-2 font-mono">{s.transportAllowance}</td>
                                            <td className="px-3 py-2 font-mono">{s.otherAllowances}</td>
                                            <td className="px-3 py-2">{s.gosiDeductionPercent}%</td>
                                        </tr>
                                    ))}
                                    {salaryHistory.length === 0 && (
                                        <tr><td colSpan={6} className="px-3 py-4 text-center text-text-muted">لا توجد بيانات</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>الإجازات / الغيابات</CardTitle>
                        </CardHeader>
                        <div className="overflow-y-auto max-h-72 p-4">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary text-text-muted uppercase text-xs">
                                    <tr><th className="px-3 py-2">النوع</th><th className="px-3 py-2">من-إلى</th><th className="px-3 py-2">الحالة</th></tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {leaves.map((l:any) => (
                                        <tr key={l.id}>
                                            <td className="px-3 py-2">{l.type}</td>
                                            <td className="px-3 py-2">{l.startDate} → {l.endDate}</td>
                                            <td className="px-3 py-2">{l.status}</td>
                                        </tr>
                                    ))}
                                    {leaves.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-text-muted">لا يوجد</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Files & audit */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>ملفات الموظف</CardTitle>
                            {isEdit && (
                                <label className="px-3 py-2 border rounded cursor-pointer flex items-center gap-2">
                                    <Upload size={14}/> رفع ملف
                                    <input type="file" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !id) return;
                                        try {
                                            await dataService.uploadEmployeeFile(id, file);
                                            showToast('تم الرفع', 'success');
                                            await loadFiles(id);
                                        } catch (err:any) {
                                            showToast(err?.message || 'فشل الرفع', 'error');
                                        }
                                    }} />
                                </label>
                            )}
                        </CardHeader>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {files.map(f => (
                                <div key={f.path} className="border rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><FileText size={14}/> {f.name}</div>
                                    <div className="flex gap-2">
                                        <a className="text-primary text-sm" href={f.url} target="_blank" rel="noreferrer">فتح</a>
                                        <button className="text-rose-600 text-sm" onClick={async ()=>{await dataService.deleteEmployeeFile(f.path); await loadFiles(id!);}}>حذف</button>
                                    </div>
                                </div>
                            ))}
                            {files.length === 0 && <div className="text-text-muted text-sm">لا توجد ملفات</div>}
                        </div>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>سجل التعديلات</CardTitle>
                        </CardHeader>
                        <div className="p-4 space-y-2 text-sm max-h-72 overflow-auto">
                            {auditLogs.map((a:any) => (
                                <div key={a.id} className="border-b pb-2">
                                    <div className="font-semibold">{a.operation}</div>
                                    <div className="text-text-muted">{a.changed_at}</div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && <div className="text-text-muted">لا يوجد سجل</div>}
                        </div>
                    </Card>
                </div>

                {/* Salary modal */}
                {showSalaryModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setShowSalaryModal(false)}>
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4">إضافة راتب جديد</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="أساسي" type="number" value={newSalary.basic} onChange={e=>setNewSalary({...newSalary, basic: Number(e.target.value)})}/>
                                <Input label="بدل سكن" type="number" value={newSalary.housing} onChange={e=>setNewSalary({...newSalary, housing: Number(e.target.value)})}/>
                                <Input label="نقل" type="number" value={newSalary.transport} onChange={e=>setNewSalary({...newSalary, transport: Number(e.target.value)})}/>
                                <Input label="أخرى" type="number" value={newSalary.other} onChange={e=>setNewSalary({...newSalary, other: Number(e.target.value)})}/>
                                <Input label="GOSI %" type="number" value={newSalary.gosi} onChange={e=>setNewSalary({...newSalary, gosi: Number(e.target.value)})}/>
                                <Input label="تاريخ السريان" type="date" value={newSalary.effective} onChange={e=>setNewSalary({...newSalary, effective: e.target.value})}/>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="ghost" onClick={()=>setShowSalaryModal(false)}>إلغاء</Button>
                                <Button onClick={async()=>{
                                    if (!id) return;
                                    await dataService.addSalaryStructure(id, { basicSalary: newSalary.basic, housingAllowance: newSalary.housing, transportAllowance: newSalary.transport, otherAllowances: newSalary.other, gosiDeductionPercent: newSalary.gosi, effectiveDate: newSalary.effective });
                                    showToast('تم الحفظ', 'success');
                                    setShowSalaryModal(false);
                                    await loadSalary(id);
                                }}>حفظ</Button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
  );
};

export default EmployeeForm;
