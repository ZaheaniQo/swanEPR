
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { PageHeader } from './ui/PageHeader';

const Dashboard: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setError(null);
        try {
            const breakEven = await dataService.getBreakEvenAnalysis();
            const contractsResult = await dataService.getContracts();
            const approvalReqs = await dataService.getApprovalRequests();
            setStats({ 
                breakEven, 
                contractCount: contractsResult.items.length, 
                pendingApprovals: approvalReqs.filter(r => r.status === 'PENDING').length 
            });
        } catch (err) {
            console.error(err);
            setError(t('msg.errorLoading'));
            setStats({ 
                breakEven: { netProfit: 0, variableCosts: 0 },
                contractCount: 0,
                pendingApprovals: 0
            });
            showToast(t('msg.errorLoading'), 'error');
        }
    };
    fetchData();
  }, []);

    if (!stats && !error) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;

    if (error && !stats) {
        return <div className="p-10 text-center text-red-600">{error}</div>;
    }

  const monthlyData = [
    { name: 'Jan', revenue: 40000, expenses: 24000, breakeven: 20000 },
    { name: 'Feb', revenue: 30000, expenses: 13980, breakeven: 20000 },
    { name: 'Mar', revenue: 20000, expenses: 9800, breakeven: 20000 },
    { name: 'Apr', revenue: 27800, expenses: 39080, breakeven: 20000 },
    { name: 'May', revenue: 18900, expenses: 4800, breakeven: 20000 },
    { name: 'Jun', revenue: 23900, expenses: 3800, breakeven: 20000 },
  ];

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

  return (
    <div className="space-y-8">
      <PageHeader 
        title={t('menu.dashboard')} 
        subtitle={`${t('app.name')} ${t('dashboard.overview')}`}
        actions={
          <div className="text-sm text-text-muted bg-surface px-4 py-2 rounded-full shadow-sm border border-border hidden md:block">
            {t('dashboard.updated')}: {t('dashboard.today')}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('kpi.netProfit')} 
            value={`${stats.breakEven.netProfit.toLocaleString()} ${t('currency')}`} 
            icon={DollarSign} 
            colorClass="text-emerald-500 bg-emerald-500"
            subtext={t('kpi.sub.revenueMinusExpenses')}
        />
        <StatCard 
            title={t('kpi.expenses')} 
            value={`${stats.breakEven.variableCosts.toLocaleString()} ${t('currency')}`} 
            icon={TrendingUp} 
            colorClass="text-red-500 bg-red-500"
            subtext={t('kpi.sub.allApproved')}
        />
        <StatCard 
            title={t('kpi.contracts')} 
            value={stats.contractCount} 
            icon={Activity} 
            colorClass="text-primary bg-primary"
            subtext={t('status.active')}
        />
        <StatCard 
            title={t('kpi.pendingApprovals')} 
            value={stats.pendingApprovals} 
            icon={AlertTriangle} 
            colorClass="text-amber-500 bg-amber-500"
            subtext={t('kpi.sub.needsAction')}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* P&L Analysis */}
        <Card>
            <CardContent>
                <h3 className="text-xl font-bold text-text mb-6">{t('chart.financialPerformance')}</h3>
                <div className="h-80 w-full text-xs" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} tick={{fill: 'var(--color-text-muted)'}} />
                            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${t('currency')}`, undefined]} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)'}} />
                            <Legend iconType="circle" />
                            <Area type="monotone" dataKey="revenue" stackId="1" stroke="var(--color-primary)" strokeWidth={3} fill="url(#colorRevenue)" name={t('chart.revenue')} />
                            <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" strokeWidth={3} fill="url(#colorExpense)" name={t('chart.expenses')} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        {/* Break Even Analysis */}
        <Card>
            <CardContent>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-text">{t('chart.breakEvenAnalysis')}</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-sm text-text-muted">{t('chart.target')}</span>
                    </div>
                </div>
                <div className="h-80 w-full text-xs" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-muted)'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} tick={{fill: 'var(--color-text-muted)'}} />
                            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${t('currency')}`, undefined]} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)'}} />
                            <Legend iconType="circle" />
                            <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff'}} name={t('chart.actualSales')} />
                            <Line type="monotone" dataKey="breakeven" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} dot={false} name={t('kpi.breakeven')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
