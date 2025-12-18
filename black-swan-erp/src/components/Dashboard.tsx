
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, AlertTriangle, Activity, Wallet, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { PageHeader } from './ui/PageHeader';

type DashboardData = Awaited<ReturnType<typeof dataService.getDashboardData>>;

const fmt = (value: number, lang: 'en' | 'ar') => value.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');

const Dashboard: React.FC = () => {
    const { t, lang } = useTranslation();
    const { showToast } = useApp();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
                setLoading(true);
                setError(null);
                try {
                        const res = await dataService.getDashboardData();
                        setData(res);
                } catch (err) {
                        console.error(err);
                        const msg = t('msg.errorLoading') || 'تعذر تحميل البيانات';
                        setError(msg);
                        showToast(msg, 'error');
                } finally {
                        setLoading(false);
                }
        };
        run();
    }, []);

    const cashFlowChart = useMemo(() => {
        if (!data?.charts.cashFlow) return [];
        return data.charts.cashFlow.map((row) => ({
                name: row.month,
                inflow: row.inflow,
                outflow: row.outflow,
                net: row.inflow - row.outflow
        }));
    }, [data]);

    const invoiceStatusChart = useMemo(() => {
        if (!data?.charts.invoicesByStatus) return [];
        return Object.entries(data.charts.invoicesByStatus).map(([status, count]) => ({ status, count }));
    }, [data]);

    const StatCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
        <Card className="relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <CardContent>
                        <div className={`absolute ${lang === 'ar' ? 'left-0 translate-x-[-1rem]' : 'right-0 translate-x-4'} top-0 opacity-5 transform -translate-y-4 group-hover:scale-110 transition-transform duration-500`}>
                                <Icon size={120} />
                        </div>
                        <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
                                             <Icon size={24} />
                                        </div>
                                        <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full text-text-muted">{subtext}</span>
                                </div>
                                <h3 className="text-3xl font-bold mb-1 tracking-tight text-text">{value}</h3>
                                <p className="text-sm font-medium text-text-muted">{title}</p>
                        </div>
                </CardContent>
        </Card>
    );

    if (loading) {
        return <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-secondary" />
            ))}
        </div>;
    }

    if (error || !data) {
        return <div className="p-10 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="space-y-8">
            <PageHeader 
                title={t('menu.dashboard')} 
                subtitle={lang === 'ar' ? 'نظرة مالية وتشغيلية حية' : 'Live financial and operational view'}
                actions={
                    <div className="text-sm text-text-muted bg-surface px-4 py-2 rounded-full shadow-sm border border-border hidden md:block">
                        {lang === 'ar' ? 'آخر تحديث الآن' : 'Just updated'}
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard 
                        title={lang === 'ar' ? 'إيرادات محصلة' : 'Collected Revenue'} 
                        value={`${fmt(data.totals.receipts, lang)} ${t('currency')}`} 
                        icon={DollarSign} 
                        colorClass="text-emerald-500 bg-emerald-500"
                        subtext={lang === 'ar' ? 'سندات القبض' : 'Receipts'}
                />
                <StatCard 
                        title={lang === 'ar' ? 'مصروفات مدفوعة' : 'Paid Expenses'} 
                        value={`${fmt(data.totals.disbursements, lang)} ${t('currency')}`} 
                        icon={TrendingUp} 
                        colorClass="text-red-500 bg-red-500"
                        subtext={lang === 'ar' ? 'مصروفات/صرفيات' : 'Disbursements'}
                />
                <StatCard 
                        title={lang === 'ar' ? 'صافي التدفق' : 'Net Cashflow'} 
                        value={`${fmt(data.totals.netCash, lang)} ${t('currency')}`} 
                        icon={Wallet} 
                        colorClass="text-primary bg-primary"
                        subtext={lang === 'ar' ? 'إيراد - مصروف' : 'Revenue - Expense'}
                />
                <StatCard 
                        title={lang === 'ar' ? 'العقود' : 'Contracts'} 
                        value={data.totals.contracts} 
                        icon={Activity} 
                        colorClass="text-blue-500 bg-blue-500"
                        subtext={lang === 'ar' ? 'إجمالي السجل' : 'Total records'}
                />
                <StatCard 
                        title={lang === 'ar' ? 'الفواتير' : 'Invoices'} 
                        value={data.totals.invoices} 
                        icon={FileText} 
                        colorClass="text-sky-500 bg-sky-500"
                        subtext={lang === 'ar' ? 'جميع الحالات' : 'All statuses'}
                />
                <StatCard 
                        title={lang === 'ar' ? 'موافقات معلقة' : 'Pending Approvals'} 
                        value={data.totals.pendingApprovals} 
                        icon={AlertTriangle} 
                        colorClass="text-amber-500 bg-amber-500"
                        subtext={lang === 'ar' ? 'بحاجة إجراء' : 'Need action'}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2">
                    <CardContent>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-text">{lang === 'ar' ? 'التدفق النقدي الشهري' : 'Monthly Cash Flow'}</h3>
                                <p className="text-sm text-text-muted">{lang === 'ar' ? 'إيرادات مقابل مصروفات حسب الشهر' : 'Inflow vs outflow by month'}</p>
                            </div>
                        </div>
                        <div className="h-80 w-full text-xs" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={cashFlowChart}>
                                            <defs>
                                                    <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                    </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} tick={{fill: 'var(--color-text-muted)'}} />
                                            <Tooltip formatter={(value: number) => [`${fmt(Number(value), lang)} ${t('currency')}`, undefined]} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)'}} />
                                            <Legend iconType="circle" />
                                            <Area type="monotone" dataKey="inflow" stroke="var(--color-primary)" strokeWidth={3} fill="url(#cfIn)" name={lang === 'ar' ? 'إيرادات' : 'Inflow'} />
                                            <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={3} fill="url(#cfOut)" name={lang === 'ar' ? 'مصروفات' : 'Outflow'} />
                                            <Line type="monotone" dataKey="net" stroke="#22c55e" strokeWidth={2} dot={false} name={lang === 'ar' ? 'صافي' : 'Net'} />
                                    </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-text">{lang === 'ar' ? 'حالة الفواتير' : 'Invoice Status'}</h3>
                                <p className="text-sm text-text-muted">{lang === 'ar' ? 'توزيع حسب الحالة' : 'Distribution by status'}</p>
                            </div>
                        </div>
                        <div className="h-80 w-full text-xs" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={invoiceStatusChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)'}} />
                                    <Bar dataKey="count" fill="var(--color-primary)" radius={[8,8,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-text">{lang === 'ar' ? 'التحصيلات الأخيرة' : 'Recent Receipts'}</h3>
                            <span className="text-sm text-text-muted">{lang === 'ar' ? 'آخر ٥ سجلات' : 'Last 5 records'}</span>
                        </div>
                        <div className="divide-y divide-border">
                            {data.recent.receipts.map((r: any) => (
                                <div key={r.id} className="py-3 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-text">{r.customer_name || (lang === 'ar' ? 'عميل غير محدد' : 'Customer')}</p>
                                        <p className="text-sm text-text-muted">{r.date?.slice(0,10) || '--'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-500">{fmt(Number(r.amount || 0), lang)} {t('currency')}</p>
                                    </div>
                                </div>
                            ))}
                            {data.recent.receipts.length === 0 && <div className="py-6 text-center text-text-muted">{lang === 'ar' ? 'لا توجد بيانات' : 'No data yet'}</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-text">{lang === 'ar' ? 'موافقات قيد الانتظار' : 'Pending Approvals'}</h3>
                            <span className="text-sm text-text-muted">{data.totals.pendingApprovals}</span>
                        </div>
                        <div className="space-y-3">
                            {data.recent.approvals.map((a: any) => (
                                <div key={a.id} className="p-3 rounded-xl bg-secondary border border-border">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-text">{a.title || a.type}</p>
                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-200">{lang === 'ar' ? 'معلق' : 'Pending'}</span>
                                    </div>
                                    <p className="text-sm text-text-muted mt-1">{a.requester_name || a.requesterId || (lang === 'ar' ? 'مستخدم' : 'User')}</p>
                                </div>
                            ))}
                            {data.recent.approvals.length === 0 && <div className="py-6 text-center text-text-muted">{lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
