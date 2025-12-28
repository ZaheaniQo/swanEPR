
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { complianceService } from '../services/supabase/compliance.service';
import { dataService } from '../services/dataService';
import { ComplianceAlert, AuditLog, TaxInvoice } from '../types';
import { AlertTriangle, CheckCircle, ShieldAlert, FileText, Download, TrendingUp, RefreshCw, CalendarRange, Clock3, ShieldCheck, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#10B981', '#F59E0B'];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const ComplianceDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useApp();

    const today = useMemo(() => new Date(), []);
    const startOfQuarter = useMemo(() => new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), [today]);

    const [range, setRange] = useState({ start: formatDate(startOfQuarter), end: formatDate(today) });
    const [vatReport, setVatReport] = useState<any>(null);
    const [zakatPack, setZakatPack] = useState<any>(null);
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buildAlerts = useCallback(async (invoices: TaxInvoice[]): Promise<ComplianceAlert[]> => {
        const checks = await Promise.all(
            invoices.map(async (inv) => {
                const issues = await complianceService.checkZatcaCompliance(inv);
                if (!issues.length) return [];
                return issues.map((issue, idx) => ({
                    id: `${inv.id}-${idx}`,
                    severity: issue.toLowerCase().includes('qr') ? 'HIGH' : issue.toLowerCase().includes('vat') ? 'MEDIUM' : 'LOW',
                    title: inv.invoiceNumber || 'Invoice',
                    description: issue,
                    entityId: inv.id,
                    entityType: 'Invoice',
                    date: inv.issueDate || (inv as any).issue_date || range.end
                } as ComplianceAlert));
            })
        );
        return checks.flat();
    }, [range.end]);

    const loadData = useCallback(async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const [vat, zakat, invoicesResp, logs] = await Promise.all([
                complianceService.getVATReport(range.start, range.end),
                complianceService.generateZakatDataPack(new Date(range.end).getFullYear()),
                dataService.getTaxInvoices(30),
                complianceService.getAuditLogs()
            ]);

            setVatReport(vat);
            setZakatPack(zakat);
            setAuditLogs((logs || []).slice(0, 8));

            const invoiceAlerts = await buildAlerts(invoicesResp.items || []);
            setAlerts(invoiceAlerts.slice(0, 8));
        } catch (err: any) {
            const message = err?.message || 'Failed to load compliance data';
            setError(message);
            showToast(message, 'error');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [buildAlerts, range.end, range.start, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const vatData = vatReport ? [
        { name: t('compliance.outputVat'), value: vatReport.output.totalVat, color: COLORS[0] },
        { name: t('compliance.inputVat'), value: vatReport.input.totalVat, color: COLORS[1] }
    ] : [];

    const openIssues = alerts.length;
    const complianceScore = Math.max(45, Math.min(100, 100 - openIssues * 5 + (vatReport ? 5 : 0)));

    const setPresetRange = (preset: 'qtd' | 'ytd' | 'last12') => {
        const now = new Date();
        if (preset === 'qtd') {
            const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            setRange({ start: formatDate(start), end: formatDate(now) });
        }
        if (preset === 'ytd') {
            setRange({ start: formatDate(new Date(now.getFullYear(), 0, 1)), end: formatDate(now) });
        }
        if (preset === 'last12') {
            const start = new Date(now);
            start.setFullYear(now.getFullYear() - 1);
            setRange({ start: formatDate(start), end: formatDate(now) });
        }
    };

    const handleExportVAT = () => {
        if (!vatReport) return;
        const payload = {
            ...vatReport,
            exportedAt: new Date().toISOString(),
            period: range
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vat-report-${range.start}-${range.end}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-10 text-center">{t('loading')}</div>;

    return (
        <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('compliance.title') || 'Compliance Control Tower'}</h1>
                    <p className="text-slate-500">{t('compliance.subtitle') || 'VAT, ZATCA, and audit readiness in one view.'}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <CalendarRange size={16} className="text-slate-500" />
                        <input
                            type="date"
                            value={range.start}
                            onChange={(e) => setRange((prev) => ({ ...prev, start: e.target.value }))}
                            className="text-sm border border-slate-200 rounded px-2 py-1"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={range.end}
                            onChange={(e) => setRange((prev) => ({ ...prev, end: e.target.value }))}
                            className="text-sm border border-slate-200 rounded px-2 py-1"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPresetRange('qtd')} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-primary">QTD</button>
                        <button onClick={() => setPresetRange('ytd')} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-primary">YTD</button>
                        <button onClick={() => setPresetRange('last12')} className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-primary">Last 12m</button>
                    </div>
                    <button onClick={handleExportVAT} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                        <Download size={16} /> {t('btn.export') || 'Export'}
                    </button>
                    <button onClick={loadData} disabled={isRefreshing} className="flex items-center gap-2 bg-white text-slate-800 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 shadow-sm disabled:opacity-60">
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> {t('compliance.refresh') || 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                        <span>{t('compliance.complianceScore') || 'Compliance Score'}</span>
                        <ShieldCheck size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{complianceScore}%</p>
                    <p className="text-xs text-slate-500 mt-1">{t('compliance.period') || 'Period'}: {range.start} → {range.end}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                        <span>{t('compliance.openIssues') || 'Open Issues'}</span>
                        <ShieldAlert size={18} className="text-amber-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{openIssues}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('compliance.subtitle') || 'Pending compliance findings'}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                        <span>{t('compliance.netPayable') || 'Net VAT Payable'}</span>
                        <AlertTriangle size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{(vatReport?.netPayable || 0).toLocaleString()} {t('currency')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('compliance.outputVat') || 'Output VAT'} {vatReport?.output?.totalVat?.toLocaleString() || 0}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                        <span>{t('compliance.zakatEstimator') || 'Zakat Estimate'}</span>
                        <TrendingUp size={18} className="text-indigo-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{zakatPack?.zakatEstimate?.amount?.toLocaleString() || 0} {t('currency')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('compliance.estZakatBase') || 'Base'}: {zakatPack?.zakatEstimate?.base?.toLocaleString() || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">{t('compliance.vatSummary') || 'VAT Summary'}</h3>
                            <p className="text-sm text-slate-500">{t('compliance.netPayable') || 'Net Payable'}: {(vatReport?.netPayable || 0).toLocaleString()} {t('currency')}</p>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Clock3 size={14} /> {t('compliance.period') || 'Period'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={vatData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {vatData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number) => `${val.toLocaleString()} ${t('currency')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">{t('compliance.totalSales') || 'Taxable Sales'}</span>
                                <span className="font-bold">{vatReport?.output?.totalSales?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">{t('compliance.outputVat') || 'Output VAT'}</span>
                                <span className="font-bold text-emerald-600">{vatReport?.output?.totalVat?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">{t('compliance.inputVat') || 'Input VAT'}</span>
                                <span className="font-bold text-amber-600">-{vatReport?.input?.totalVat?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="font-bold text-slate-800">{t('compliance.netDue') || 'Net Due'}</span>
                                <span className="font-bold text-slate-900">{vatReport?.netPayable?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" /> {t('compliance.zakatEstimator') || 'Zakat Estimator'}
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-lg text-center">
                            <p className="text-indigo-600 text-xs font-bold uppercase mb-1">{t('compliance.estZakatBase') || 'Zakat Base'}</p>
                            <p className="text-2xl font-bold text-slate-900">{zakatPack?.zakatEstimate?.base?.toLocaleString() || 0} {t('currency')}</p>
                        </div>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('compliance.zakatRate') || 'Zakat Rate'}</span>
                                <span className="font-bold">2.5%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('compliance.approxPayable') || 'Approx. Payable'}</span>
                                <span className="font-bold text-indigo-600">{zakatPack?.zakatEstimate?.amount?.toLocaleString() || 0} {t('currency')}</span>
                            </div>
                        </div>
                        <button className="w-full mt-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 flex items-center justify-center gap-2">
                            <FileText size={16} /> {t('compliance.downloadPack') || 'Download Pack'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-amber-500" /> {t('compliance.alerts') || 'Compliance Alerts'}
                    </h3>
                    {alerts.length === 0 ? (
                        <div className="text-sm text-slate-500">{t('noData')}</div>
                    ) : (
                        <ul className="space-y-3">
                            {alerts.map((alert) => (
                                <li key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                                    <div className={`w-2 h-10 rounded-full mt-0.5 ${alert.severity === 'HIGH' ? 'bg-red-500' : alert.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-800">{alert.title}</p>
                                            <span className="text-xs text-slate-400">{alert.date?.slice(0, 10)}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-500" /> {t('compliance.auditTrail') || 'Audit Trail'}
                    </h3>
                    {auditLogs.length === 0 ? (
                        <div className="text-sm text-slate-500">{t('noData')}</div>
                    ) : (
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="p-3 border border-slate-100 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-slate-800">{log.action}</span>
                                        <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{log.entityType} · {log.entityId}</p>
                                    <p className="text-xs text-slate-500 mt-1">{log.userName}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplianceDashboard;
