
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertTriangle, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t, lang } = useTranslation();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
        const breakEven = await dataService.getBreakEvenAnalysis();
        const contracts = await dataService.getContracts();
        const approvalReqs = await dataService.getApprovalRequests();
        const contractCount = (contracts as any).items ? (contracts as any).items.length : (contracts as any).length;
        
        setStats({ 
            breakEven, 
            contractCount,
            pendingApprovals: approvalReqs.filter(r => r.status === 'PENDING').length 
        });
    };
    fetchData();
  }, []);

  if (!stats) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>;

  const monthlyData = [
    { name: lang === 'ar' ? 'يناير' : 'Jan', revenue: 40000, expenses: 24000, breakeven: 20000 },
    { name: lang === 'ar' ? 'فبراير' : 'Feb', revenue: 30000, expenses: 13980, breakeven: 20000 },
    { name: lang === 'ar' ? 'مارس' : 'Mar', revenue: 20000, expenses: 9800, breakeven: 20000 },
    { name: lang === 'ar' ? 'أبريل' : 'Apr', revenue: 27800, expenses: 39080, breakeven: 20000 },
    { name: lang === 'ar' ? 'مايو' : 'May', revenue: 18900, expenses: 4800, breakeven: 20000 },
    { name: lang === 'ar' ? 'يونيو' : 'Jun', revenue: 23900, expenses: 3800, breakeven: 20000 },
  ];

  const StatCard = ({ title, value, icon: Icon, gradient, subtext }: any) => (
    <div className={`p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${gradient}`}>
        <div className={`absolute ${lang === 'ar' ? 'left-0 translate-x-[-1rem]' : 'right-0 translate-x-4'} top-0 opacity-10 transform -translate-y-4 group-hover:scale-110 transition-transform duration-500`}>
            <Icon size={120} />
        </div>
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                   <Icon size={24} className="text-white" />
                </div>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white/90">{subtext}</span>
            </div>
            <h3 className="text-3xl font-bold mb-1 tracking-tight">{value}</h3>
            <p className="text-sm font-medium text-white/80">{title}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('menu.dashboard')}</h1>
            <p className="text-slate-500 mt-1">{t('dashboard.overview')}</p>
          </div>
          <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hidden md:block">
            {t('dashboard.updated')}: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('kpi.netProfit')} 
            value={`${stats.breakEven.netProfit.toLocaleString()} ${t('currency')}`} 
            icon={DollarSign} 
            gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
            subtext={t('kpi.sub.revenueMinusExpenses')}
        />
        <StatCard 
            title={t('kpi.expenses')} 
            value={`${stats.breakEven.variableCosts.toLocaleString()} ${t('currency')}`} 
            icon={TrendingUp} 
            gradient="bg-gradient-to-br from-red-500 to-rose-700"
            subtext={t('kpi.sub.allApproved')}
        />
        <StatCard 
            title={t('kpi.contracts')} 
            value={stats.contractCount} 
            icon={Activity} 
            gradient="bg-gradient-to-br from-indigo-500 to-purple-700"
            subtext={t('status')}
        />
        <StatCard 
            title={t('kpi.pendingApprovals')} 
            value={stats.pendingApprovals} 
            icon={AlertTriangle} 
            gradient="bg-gradient-to-br from-amber-400 to-orange-600"
            subtext={t('kpi.sub.needsAction')}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* P&L Analysis */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <h3 className="text-xl font-bold text-slate-800 mb-6">{t('chart.financialPerformance')}</h3>
            <div className="h-80 w-full text-xs" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} tick={{fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', textAlign: lang === 'ar' ? 'right' : 'left'}} />
                        <Legend iconType="circle" />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0d9488" strokeWidth={3} fill="url(#colorRevenue)" name={t('chart.revenue')} />
                        <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" strokeWidth={3} fill="url(#colorExpense)" name={t('chart.expenses')} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Break Even Analysis */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">{t('chart.breakEvenAnalysis')}</h3>
                <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                     <span className="text-sm text-slate-500">{t('chart.target')}</span>
                </div>
            </div>
            <div className="h-80 w-full text-xs" dir="ltr">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} tick={{fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', textAlign: lang === 'ar' ? 'right' : 'left'}} />
                        <Legend iconType="circle" />
                        <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} dot={{r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff'}} name={t('chart.actualSales')} />
                        <Line type="monotone" dataKey="breakeven" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} dot={false} name={t('kpi.breakeven')} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
