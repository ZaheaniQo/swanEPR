import { Briefcase, Calendar, DollarSign, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import { useApp, useTranslation } from '../AppContext';
import { dataService } from '../services/dataService';
import { Employee } from '../types';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

const HR: React.FC = () => {
    const { t, lang } = useTranslation();
        const { showToast, signOut } = useApp();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    const [showHiringModal, setShowHiringModal] = useState(false);
    const [hireRole, setHireRole] = useState('');
    const [hireDept, setHireDept] = useState('');
    const [hireNotes, setHireNotes] = useState('');
  
    const loadData = useCallback(async () => {
        try {
            const data = await dataService.getEmployees();
            setEmployees(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'تعذر تحميل بيانات الموظفين';
            showToast(msg, 'error');
            if (msg.toLowerCase().includes('unauthorized')) {
                await signOut();
                navigate('/login');
            }
        }
    }, [navigate, showToast, signOut]);

    useEffect(() => {
        loadData();
    }, [loadData]);

  const totalPayroll = employees.reduce((acc, curr) => 
    acc + curr.basicSalary + curr.housingAllowance + curr.transportAllowance + (curr.otherAllowances || 0), 0
  );

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const leaveCount = employees.filter(e => e.status === 'On Leave').length;

    const daysUntil = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        const today = new Date();
        return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const soonThreshold = 60;
    const contractExpiring = employees
        .map(emp => ({ emp, meta: getContractMeta(emp) }))
        .filter(({ meta }) => meta.daysLeft !== undefined && meta.daysLeft <= soonThreshold);

    const iqamaExpiring = employees.filter(e => {
        const d = daysUntil(e.iqamaExpiry);
        return d !== undefined && d <= soonThreshold;
    });

    const passportExpiring = employees.filter(e => {
        const d = daysUntil(e.passportExpiry);
        return d !== undefined && d <= soonThreshold;
    });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Hoisted function to avoid ReferenceError when used above
    function getContractMeta(emp: Employee) {
        if (!emp.joinDate || !emp.contractDurationDays) return { endDate: '', daysLeft: undefined };
        const start = new Date(emp.joinDate);
        const end = new Date(start);
        end.setDate(end.getDate() + Number(emp.contractDurationDays));
        const today = new Date();
        const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { endDate: end.toISOString().split('T')[0], daysLeft: diff };
    }

    const getContractBadge = (daysLeft?: number) => {
        if (daysLeft === undefined) return { text: t('hr.contract') || 'Contract', cls: 'bg-slate-100 text-slate-600' };
        if (daysLeft <= 0) return { text: t('hr.contractExpired') || 'منتهي', cls: 'bg-rose-100 text-rose-700' };
        if (daysLeft <= 30) return { text: `${daysLeft} يوم متبق`, cls: 'bg-amber-100 text-amber-700' };
        if (daysLeft <= 90) return { text: `${daysLeft} يوم متبق`, cls: 'bg-yellow-100 text-yellow-700' };
        return { text: `${daysLeft} يوم متبق`, cls: 'bg-emerald-100 text-emerald-700' };
    };

  return (
    <div className="space-y-6">
        <PageHeader 
            title={t('hr.title')} 
            subtitle={t('hr.subtitle')}
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowHiringModal(true)}>
                        <UserPlus size={18} className="mr-2" /> طلب توظيف
                    </Button>
                    <Button onClick={() => navigate('/hr/new')}>
                        <UserPlus size={18} className="mr-2" /> {t('hr.addEmployee')}
                    </Button>
                </div>
            }
        />

        {/* HR Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 mb-1 text-sm">{t('hr.totalPayroll')}</p>
                    <h2 className="text-3xl font-bold">{totalPayroll.toLocaleString()} {t('currency')}</h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center relative z-10">
                    <DollarSign size={24} className="text-[#D4A373]" />
                </div>
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#D4A373]/10 rounded-full blur-2xl"></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <p className="text-slate-500 mb-1 text-sm">{t('hr.activeStaff')}</p>
                    <h2 className="text-3xl font-bold text-slate-800">{activeCount}</h2>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Users size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <p className="text-slate-500 mb-1 text-sm">{t('hr.onLeave')}</p>
                    <h2 className="text-3xl font-bold text-slate-800">{leaveCount}</h2>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Calendar size={24} />
                </div>
            </div>
        </div>

        {/* Expiry alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-amber-800">عقود تنتهي قريباً</div>
                    <span className="text-amber-700 font-bold text-lg">{contractExpiring.length}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-auto text-sm text-amber-900">
                    {contractExpiring.slice(0,5).map(({ emp, meta }) => (
                        <div key={emp.id} className="flex justify-between"><span>{emp.name}</span><span>{meta.endDate}</span></div>
                    ))}
                    {contractExpiring.length === 0 && <div className="text-amber-700">لا يوجد</div>}
                </div>
            </div>
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-rose-800">إقامات قرب الانتهاء</div>
                    <span className="text-rose-700 font-bold text-lg">{iqamaExpiring.length}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-auto text-sm text-rose-900">
                    {iqamaExpiring.slice(0,5).map(emp => (
                        <div key={emp.id} className="flex justify-between"><span>{emp.name}</span><span>{emp.iqamaExpiry}</span></div>
                    ))}
                    {iqamaExpiring.length === 0 && <div className="text-rose-700">لا يوجد</div>}
                </div>
            </div>
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-blue-800">جوازات قرب الانتهاء</div>
                    <span className="text-blue-700 font-bold text-lg">{passportExpiring.length}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-auto text-sm text-blue-900">
                    {passportExpiring.slice(0,5).map(emp => (
                        <div key={emp.id} className="flex justify-between"><span>{emp.name}</span><span>{emp.passportExpiry}</span></div>
                    ))}
                    {passportExpiring.length === 0 && <div className="text-blue-700">لا يوجد</div>}
                </div>
            </div>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {employees.map(emp => (
                                <div 
                                        key={emp.id} 
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(`/hr/${emp.id}/edit`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                navigate(`/hr/${emp.id}/edit`);
                                            }
                                        }}
                                        className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 to-slate-100 group-hover:from-primary group-hover:to-primary transition-all duration-500"></div>
                    
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xl border-2 border-white shadow-sm">
                            {getInitials(emp.name)}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {emp.status}
                        </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-primary transition-colors">{emp.name}</h3>
                    <p className="text-slate-500 text-sm mb-4 flex items-center gap-1"><Briefcase size={14}/> {emp.role}</p>
                    {(() => {
                        const meta = getContractMeta(emp);
                        const badge = getContractBadge(meta.daysLeft);
                        return (
                          <div className="flex items-center justify-between text-xs mb-4">
                            <span className={`px-2 py-1 rounded-full font-semibold ${badge.cls}`}>{badge.text}</span>
                            {meta.endDate && <span className="text-slate-500">ينتهي: {meta.endDate}</span>}
                          </div>
                        );
                    })()}
                    <p className="text-xs text-slate-500 mb-4">{t('hr.systemRole') || 'System Role'}: <span className="font-semibold text-slate-700">{emp.systemRole || '—'}</span></p>
                    
                    <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">{t('hr.department')}</span>
                            <span className="font-medium text-slate-700">{emp.department}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">{t('hr.joined')}</span>
                            <span className="font-medium text-slate-700">{emp.joinDate}</span>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedEmp(emp); setShowLeaveModal(true); }}>
                                طلب إجازة
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Leave modal */}
                {showLeaveModal && selectedEmp && (
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Close leave modal"
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={(event) => {
                                if (event.target === event.currentTarget) {
                                    setShowLeaveModal(false);
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.target === event.currentTarget && (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    setShowLeaveModal(false);
                                }
                            }}
                        >
                <div
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
                >
                    <h3 className="text-lg font-bold mb-4">طلب إجازة - {selectedEmp.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <input className="border border-slate-200 rounded px-3 py-2" type="date" value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)} placeholder="من" />
                        <input className="border border-slate-200 rounded px-3 py-2" type="date" value={leaveTo} onChange={e => setLeaveTo(e.target.value)} placeholder="إلى" />
                    </div>
                    <textarea className="w-full border border-slate-200 rounded px-3 py-2 mb-4" rows={3} placeholder="سبب الإجازة" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}></textarea>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>إلغاء</Button>
                        <Button onClick={async () => {
                            if (!leaveFrom || !leaveTo) { showToast('أدخل تاريخ البداية والنهاية', 'error'); return; }
                            try {
                                await dataService.requestLeaveApproval({
                                    employeeId: selectedEmp.id,
                                    employeeName: selectedEmp.name,
                                    from: leaveFrom,
                                    to: leaveTo,
                                    reason: leaveReason
                                });
                                showToast('تم إرسال طلب الإجازة للموافقة', 'success');
                                setShowLeaveModal(false);
                                setLeaveFrom(''); setLeaveTo(''); setLeaveReason('');
                            } catch (e: any) {
                                showToast(e.message || 'تعذر إرسال الطلب', 'error');
                            }
                        }}>إرسال للموافقة</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Hiring modal */}
                {showHiringModal && (
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Close hiring modal"
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={(event) => {
                                if (event.target === event.currentTarget) {
                                    setShowHiringModal(false);
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.target === event.currentTarget && (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    setShowHiringModal(false);
                                }
                            }}
                        >
                <div
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
                >
                    <h3 className="text-lg font-bold mb-4">طلب توظيف جديد</h3>
                    <div className="space-y-3 mb-4">
                        <input className="w-full border border-slate-200 rounded px-3 py-2" placeholder="المسمى الوظيفي" value={hireRole} onChange={e => setHireRole(e.target.value)} />
                        <input className="w-full border border-slate-200 rounded px-3 py-2" placeholder="القسم" value={hireDept} onChange={e => setHireDept(e.target.value)} />
                        <textarea className="w-full border border-slate-200 rounded px-3 py-2" rows={3} placeholder="ملاحظات" value={hireNotes} onChange={e => setHireNotes(e.target.value)}></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowHiringModal(false)}>إلغاء</Button>
                        <Button onClick={async () => {
                            if (!hireRole) { showToast('أدخل المسمى الوظيفي', 'error'); return; }
                            try {
                                await dataService.requestHiringApproval({ role: hireRole, department: hireDept, notes: hireNotes });
                                showToast('تم إرسال طلب التوظيف للموافقة', 'success');
                                setShowHiringModal(false);
                                setHireRole(''); setHireDept(''); setHireNotes('');
                            } catch (e: any) {
                                showToast(e.message || 'تعذر إرسال الطلب', 'error');
                            }
                        }}>إرسال للموافقة</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HR;
