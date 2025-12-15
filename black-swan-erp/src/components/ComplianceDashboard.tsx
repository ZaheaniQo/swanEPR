
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { complianceService } from '../services/supabase/compliance.service';
import { AlertTriangle, CheckCircle, ShieldAlert, FileText, Download, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ComplianceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [vatReport, setVatReport] = useState<any>(null);
  const [zakatPack, setZakatPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Mock date range for demo
    const report = await complianceService.getVATReport('2023-01-01', '2023-12-31');
    const zData = await complianceService.generateZakatDataPack(2023);
    setVatReport(report);
    setZakatPack(zData);
    setLoading(false);
  };

  const vatData = vatReport ? [
      { name: t('compliance.outputVat'), value: vatReport.output.totalVat, color: '#10B981' },
      { name: t('compliance.inputVat'), value: vatReport.input.totalVat, color: '#F59E0B' }
  ] : [];

  if (loading) return <div className="p-10 text-center">{t('loading')}</div>;

  return (
    <div className="space-y-8 animate-slide-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('compliance.title')}</h1>
                <p className="text-slate-500">{t('compliance.subtitle')}</p>
            </div>
            <div className="flex gap-2">
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">
                    <Download size={16}/> {t('btn.exportAudit')}
                </button>
            </div>
        </div>

        {/* ALERTS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="font-bold text-red-800 flex items-center gap-2 mb-4">
                    <ShieldAlert size={20}/> {t('compliance.criticalAlerts')}
                </h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                        <span>3 Simplified Invoices missing QR Code data.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                        <span>1 High-Value Disbursement pending approval &gt; 48hrs.</span>
                    </li>
                </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-4">
                    <CheckCircle size={20}/> {t('compliance.health')}
                </h3>
                <ul className="space-y-3">
                    <li className="flex items-center justify-between text-sm text-blue-700">
                        <span>ZATCA Integration (Phase 1)</span>
                        <span className="bg-blue-100 px-2 py-1 rounded text-xs font-bold">{t('status.active')}</span>
                    </li>
                    <li className="flex items-center justify-between text-sm text-blue-700">
                        <span>VAT Registration</span>
                        <span className="bg-blue-100 px-2 py-1 rounded text-xs font-bold">Valid</span>
                    </li>
                    <li className="flex items-center justify-between text-sm text-blue-700">
                        <span>SoD (Segregation of Duties)</span>
                        <span className="bg-blue-100 px-2 py-1 rounded text-xs font-bold">Enforced</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* VAT & ZAKAT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* VAT SUMMARY */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-2">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800">{t('compliance.vatSummary')}</h3>
                        <p className="text-sm text-slate-500">{t('compliance.netPayable')}: {vatReport?.netPayable.toLocaleString()} {t('currency')}</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold">
                        Quarterly Filing
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={vatData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                    {vatData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val:number) => val.toLocaleString() + ' ' + t('currency')} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 justify-center flex flex-col text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">{t('compliance.totalSales')}</span>
                            <span className="font-bold">{vatReport?.output.totalSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">{t('compliance.outputVat')}</span>
                            <span className="font-bold text-emerald-600">{vatReport?.output.totalVat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500">{t('compliance.inputVat')}</span>
                            <span className="font-bold text-amber-600">-{vatReport?.input.totalVat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2">
                            <span className="font-bold text-slate-800">{t('compliance.netDue')}</span>
                            <span className="font-bold text-slate-900">{vatReport?.netPayable.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ZAKAT ESTIMATOR */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-600"/> {t('compliance.zakatEstimator')}
                </h3>
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-lg text-center">
                        <p className="text-indigo-600 text-xs font-bold uppercase mb-1">{t('compliance.estZakatBase')}</p>
                        <p className="text-2xl font-bold text-slate-900">{zakatPack?.zakatEstimate.base.toLocaleString()} {t('currency')}</p>
                    </div>
                    
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">{t('compliance.zakatRate')}</span>
                            <span className="font-bold">2.5%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">{t('compliance.approxPayable')}</span>
                            <span className="font-bold text-indigo-600">{zakatPack?.zakatEstimate.amount.toLocaleString()} {t('currency')}</span>
                        </div>
                    </div>

                    <button className="w-full mt-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 flex items-center justify-center gap-2">
                        <FileText size={16}/> {t('btn.downloadPack')}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ComplianceDashboard;
