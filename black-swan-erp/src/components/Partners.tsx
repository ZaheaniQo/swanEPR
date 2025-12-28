
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

const Partners: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    dataService.getBreakEvenAnalysis().then(setStats);
  }, []);

  if (!stats) return <div>{t('loading')}</div>;

  const data = [
    { name: t('chart.expenses'), value: stats.fixedCosts + stats.variableCosts, color: '#F87171' },
    { name: t('partners.netProfit'), value: stats.netProfit, color: '#34D399' },
  ];

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('partners.title')}</h1>
            <p className="text-slate-500">{t('partners.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                 <h2 className="text-lg font-bold text-slate-700 mb-6">{t('partners.dist')}</h2>
                 <div className="w-full h-64" dir="ltr">
                     <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                 {data.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                             </Pie>
                             <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t('currency')}`} />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
                 <div className="flex gap-4 text-sm">
                     {data.map(d => (
                         <div key={d.name} className="flex items-center gap-1">
                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                             <span>{d.name}</span>
                         </div>
                     ))}
                 </div>
            </div>

            <div className="space-y-4">
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                    <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2"><TrendingUp /> {t('partners.netProfit')}</h3>
                    <p className="text-4xl font-bold text-emerald-600">{stats.netProfit.toLocaleString()} {t('currency')}</p>
                    <p className="text-sm text-emerald-600 mt-2">{t('partners.available')}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                     <h3 className="font-bold text-slate-700 mb-4">{t('partners.shares')}</h3>
                     <div className="space-y-4">
                         <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Partner A (40%)</span>
                                 <span className="font-bold">{(stats.netProfit * 0.4).toLocaleString()} {t('currency')}</span>
                             </div>
                             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                 <div className="bg-slate-800 h-full w-[40%]"></div>
                             </div>
                         </div>
                         <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Partner B (30%)</span>
                                 <span className="font-bold">{(stats.netProfit * 0.3).toLocaleString()} {t('currency')}</span>
                             </div>
                             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                 <div className="bg-slate-600 h-full w-[30%]"></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Partners;
