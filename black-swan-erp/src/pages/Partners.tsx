
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeftRight,
    ArrowUpRight,
    CheckCircle2,
    CircleOff,
    Clock3,
    FileDown,
    Loader2,
    Plus,
    ShieldCheck,
    TrendingUp,
    Users
} from 'lucide-react';

import { useTranslation } from '../AppContext';
import { dataService } from '../services/dataService';

type TabKey = 'overview' | 'cap-table' | 'manage' | 'capital' | 'equity' | 'timeline';

type CapTableSummary = {
    netProfit: number;
    valuation: number;
    totalShares: number;
    pricePerShare: number;
    currency: string;
};

type CapTableRow = {
    partnerId: string;
    profileId: string;
    partnerName: string;
    shares: number;
    ownershipPct: number;
    currentValue: number;
    status: 'ACTIVE' | 'INACTIVE';
    joinedAt: string | null;
    exitedAt: string | null;
};

type CapTablePayload = {
    rows: CapTableRow[];
    summary: CapTableSummary;
    canManage: boolean;
    restrictedToProfileId?: string | null;
};

type CapitalEventFormState = {
    eventType: 'INCREASE' | 'DECREASE';
    amount: string;
    valuation: string;
    notes: string;
};

type EquityFormState = {
    transactionType: 'ISSUE' | 'TRANSFER' | 'BUYBACK';
    fromPartnerId?: string;
    toPartnerId?: string;
    shares: string;
    pricePerShare: string;
    valuation: string;
};

type PartnerFormState = {
    profileId: string;
    joinedAt: string;
};

type EquityPreview = {
    rows: CapTableRow[];
    summary: CapTableSummary;
};

type AuditEvent = {
    eventTime: string;
    eventType: 'EQUITY' | 'CAPITAL' | 'APPROVAL' | 'AUDIT';
    description: string;
    referenceType: string;
    referenceId: string | null;
    performedBy: string | null;
    approvalStatus: string | null;
    partnerId: string | null;
};

const formatCurrency = (value: number, currency = 'SAR') =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency }).format(value || 0);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse rounded-xl border border-slate-200 bg-white p-4 ${className || ''}`}>
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="mt-4 h-6 w-1/2 rounded bg-slate-200" />
        <div className="mt-4 h-3 w-full rounded bg-slate-100" />
    </div>
);

const Partners: React.FC = () => {
    const { t } = useTranslation();
    const translate = useCallback((key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    }, [t]);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [capData, setCapData] = useState<CapTablePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [capitalForm, setCapitalForm] = useState<CapitalEventFormState>({
        eventType: 'INCREASE',
        amount: '',
        valuation: '',
        notes: ''
    });
    const [equityForm, setEquityForm] = useState<EquityFormState>({
        transactionType: 'ISSUE',
        fromPartnerId: '',
        toPartnerId: '',
        shares: '',
        pricePerShare: '',
        valuation: ''
    });
    const [partnerForm, setPartnerForm] = useState<PartnerFormState>({ profileId: '', joinedAt: '' });
    const [statusUpdate, setStatusUpdate] = useState<{ partnerId: string; status: 'ACTIVE' | 'INACTIVE'; exitDate: string }>(
        { partnerId: '', status: 'INACTIVE', exitDate: '' }
    );
    const [preview, setPreview] = useState<EquityPreview | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [timeline, setTimeline] = useState<AuditEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);
    const [timelinePartnerFilter, setTimelinePartnerFilter] = useState<string>('');

    const partnerOptions = useMemo(() => capData?.rows || [], [capData]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await dataService.getCapTable();
            setCapData(data);
            setEquityForm((prev) => ({
                ...prev,
                valuation: prev.valuation || String(data.summary.valuation || ''),
                pricePerShare: prev.pricePerShare || String(data.summary.pricePerShare || '')
            }));
            setCapitalForm((prev) => ({
                ...prev,
                valuation: prev.valuation || String(data.summary.valuation || '')
            }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.load', 'Unable to load partners data');
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [translate]);

    const loadTimeline = useCallback(async (partnerId?: string) => {
        setTimelineLoading(true);
        setTimelineError(null);
        try {
            const data = await dataService.getPartnerAuditTimeline(partnerId || undefined);
            setTimeline(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.timeline', 'Unable to load audit timeline');
            setTimelineError(message);
        } finally {
            setTimelineLoading(false);
        }
    }, [translate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!capData) {
            setPreview(null);
            return;
        }
        const shares = Number(equityForm.shares || 0);
        const valuation = Number(equityForm.valuation || capData.summary.valuation || 0);
        const pricePerShare = Number(equityForm.pricePerShare || capData.summary.pricePerShare || 0);
        if (!shares || shares <= 0) {
            setPreview(null);
            return;
        }

        try {
            const draftPreview = dataService.previewEquityImpact(capData, {
                transactionType: equityForm.transactionType,
                fromPartnerId: equityForm.fromPartnerId,
                toPartnerId: equityForm.toPartnerId,
                shares,
                pricePerShare,
                valuation
            });
            setPreview(draftPreview);
        } catch (err) {
            console.error('previewEquityImpact', err);
            setPreview(null);
        }
    }, [capData, equityForm]);

    useEffect(() => {
        if (activeTab === 'timeline') {
            loadTimeline(timelinePartnerFilter || undefined);
        }
    }, [activeTab, timelinePartnerFilter, loadTimeline]);

    const handleAddPartner = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setToast(null);
        try {
            await dataService.addPartner(partnerForm.profileId, partnerForm.joinedAt);
            setToast(translate('partners.toast.added', 'Partner added and linked. Awaiting equity actions.'));
            setPartnerForm({ profileId: '', joinedAt: '' });
            await loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.addPartner', 'Unable to add partner');
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setToast(null);
        try {
            await dataService.updatePartnerStatus(statusUpdate.partnerId, statusUpdate.status, statusUpdate.exitDate || null);
            setToast(translate('partners.toast.statusUpdated', 'Partner status updated'));
            setStatusUpdate({ partnerId: '', status: 'INACTIVE', exitDate: '' });
            await loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.updatePartner', 'Unable to update partner');
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCapitalSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!capData?.canManage) return;
        setSubmitting(true);
        setToast(null);
        try {
            await dataService.createCapitalEvent({
                eventType: capitalForm.eventType,
                amount: Number(capitalForm.amount || 0),
                valuation: Number(capitalForm.valuation || 0),
                notes: capitalForm.notes
            });
            setToast(translate('partners.toast.capitalSubmitted', 'Capital event submitted for approval'));
            await loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.capital', 'Unable to submit capital event');
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEquitySubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!capData?.canManage) return;
        setSubmitting(true);
        setToast(null);
        try {
            await dataService.createEquityTransaction({
                transactionType: equityForm.transactionType,
                fromPartnerId: equityForm.fromPartnerId || undefined,
                toPartnerId: equityForm.toPartnerId || undefined,
                shares: Number(equityForm.shares || 0),
                pricePerShare: Number(equityForm.pricePerShare || 0),
                valuation: Number(equityForm.valuation || 0)
            });
            setToast(translate('partners.toast.equitySubmitted', 'Equity transaction submitted for approval'));
            await loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.equity', 'Unable to submit transaction');
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGeneratePdf = async () => {
        if (!capData?.canManage) return;
        setPdfGenerating(true);
        setToast(null);
        try {
            const blob = await dataService.generateCapTablePDF(capData);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'cap-table.pdf';
            link.click();
            URL.revokeObjectURL(url);
            setToast(translate('partners.toast.pdfGenerated', 'Cap table PDF downloaded'));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : translate('partners.error.pdf', 'Unable to generate PDF');
            setError(message);
        } finally {
            setPdfGenerating(false);
        }
    };

    const renderTabs = () => (
        <div className="flex flex-wrap gap-2 rounded-lg bg-white p-2 shadow-sm border border-slate-200">
            {[
                { key: 'overview', label: t('partners.overview') || 'Overview' },
                { key: 'cap-table', label: t('partners.capTable') || 'Cap Table' },
                { key: 'manage', label: t('partners.manage') || 'Manage Partners' },
                { key: 'capital', label: t('partners.capital') || 'Capital' },
                { key: 'equity', label: t('partners.equity') || 'Equity' },
                { key: 'timeline', label: t('partners.timeline') || 'Audit Timeline' }
            ].map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab.key
                            ? 'bg-slate-900 text-white shadow'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const summaryCards = () => {
        if (!capData) {
            return (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            );
        }

        const { summary } = capData;
        const cards = [
            {
                title: t('partners.netProfit') || 'Net Profit',
                value: formatCurrency(summary.netProfit, summary.currency),
                icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
                accent: 'bg-emerald-50'
            },
            {
                title: t('partners.valuation') || 'Valuation',
                value: formatCurrency(summary.valuation, summary.currency),
                icon: <ArrowUpRight className="h-5 w-5 text-blue-600" />,
                accent: 'bg-blue-50'
            },
            {
                title: t('partners.totalShares') || 'Total Shares',
                value: summary.totalShares.toLocaleString(),
                icon: <Users className="h-5 w-5 text-slate-700" />,
                accent: 'bg-slate-50'
            },
            {
                title: t('partners.pricePerShare') || 'Price / Share',
                value: formatCurrency(summary.pricePerShare, summary.currency),
                icon: <ShieldCheck className="h-5 w-5 text-amber-600" />,
                accent: 'bg-amber-50'
            }
        ];

        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.title} className={`rounded-xl border border-slate-200 p-4 shadow-sm ${card.accent}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-600">{card.title}</p>
                            {card.icon}
                        </div>
                        <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
                        <p className="mt-1 text-xs text-slate-500">{t('partners.asOf') || 'as of now'}</p>
                    </div>
                ))}
            </div>
        );
    };

    const capTableView = () => (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">{t('partners.capTable') || 'Cap Table'}</p>
                    <p className="text-xs text-slate-500">{t('partners.capTableSnapshot') || 'Snapshot uses latest approved valuation with tenant scoping.'}</p>
                </div>
                {capData?.canManage && (
                    <button
                        type="button"
                        onClick={handleGeneratePdf}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t('partners.exportPdf') || 'Export PDF'}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">{t('partners.name') || 'Partner'}</th>
                            <th className="px-4 py-3 font-semibold">{t('partners.shares') || 'Shares'}</th>
                            <th className="px-4 py-3 font-semibold">{t('partners.ownership') || 'Ownership %'}</th>
                            <th className="px-4 py-3 font-semibold">{t('partners.currentValue') || 'Value'}</th>
                            <th className="px-4 py-3 font-semibold">{t('partners.status') || 'Status'}</th>
                            <th className="px-4 py-3 font-semibold">{t('partners.joinedAt') || 'Joined'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {capData?.rows.map((row) => (
                            <tr key={row.partnerId} className="border-t border-slate-100">
                                <td className="px-4 py-3 font-semibold text-slate-900">{row.partnerName}</td>
                                <td className="px-4 py-3 text-slate-700">{row.shares.toLocaleString()}</td>
                                <td className="px-4 py-3 text-slate-700">{formatPercent(row.ownershipPct)}</td>
                                <td className="px-4 py-3 text-slate-700">{formatCurrency(row.currentValue)}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                            row.status === 'ACTIVE'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {row.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}
                                        {row.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700">{row.joinedAt || '-'}</td>
                            </tr>
                        ))}
                        {capData && capData.rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                    {t('partners.empty') || 'No partners yet. Add one to get started.'}
                                </td>
                            </tr>
                        )}
                        {!capData && (
                            <tr>
                                <td colSpan={6} className="px-4 py-4">
                                    <SkeletonCard className="w-full" />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {t('partners.capTableNote') || 'Percentages are derived from shares / total shares. Share price uses latest approved valuation.'}
            </div>
        </div>
    );

    const managePartners = () => (
        <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleAddPartner} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800">
                    <Plus className="h-5 w-5" />
                    <h3 className="text-lg font-bold">{t('partners.addPartner') || 'Add Partner'}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t('partners.addPartnerDesc') || 'Link an existing profile and set the join date.'}</p>
                <div className="mt-4 grid gap-3">
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.profileId') || 'Profile ID'}
                        <input
                            value={partnerForm.profileId}
                            onChange={(e) => setPartnerForm((prev) => ({ ...prev, profileId: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.joinedAt') || 'Joined At'}
                        <input
                            type="date"
                            value={partnerForm.joinedAt}
                            onChange={(e) => setPartnerForm((prev) => ({ ...prev, joinedAt: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                        />
                    </label>
                    <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
                        disabled={submitting}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t('partners.addPartner') || 'Add Partner'}
                    </button>
                </div>
            </form>

            <form onSubmit={handleStatusChange} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800">
                    <ShieldCheck className="h-5 w-5" />
                    <h3 className="text-lg font-bold">{t('partners.statusActions') || 'Activate / Deactivate'}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t('partners.statusDesc') || 'Control partner lifecycle without deleting historical records.'}</p>
                <div className="mt-4 grid gap-3">
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.partner') || 'Partner'}
                        <select
                            value={statusUpdate.partnerId}
                            onChange={(e) => setStatusUpdate((prev) => ({ ...prev, partnerId: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                        >
                            <option value="">{t('partners.selectPartner') || 'Select partner'}</option>
                            {partnerOptions.map((p) => (
                                <option key={p.partnerId} value={p.partnerId}>
                                    {p.partnerName}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.status') || 'Status'}
                        <select
                            value={statusUpdate.status}
                            onChange={(e) => setStatusUpdate((prev) => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        >
                            <option value="ACTIVE">{t('partners.activate') || 'Activate'}</option>
                            <option value="INACTIVE">{t('partners.deactivate') || 'Deactivate'}</option>
                        </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.exitDate') || 'Exit Date (optional)'}
                        <input
                            type="date"
                            value={statusUpdate.exitDate}
                            onChange={(e) => setStatusUpdate((prev) => ({ ...prev, exitDate: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        />
                    </label>
                    <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500"
                        disabled={submitting}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t('partners.update') || 'Update'}
                    </button>
                </div>
            </form>
        </div>
    );

    const capitalManagement = () => (
        <form onSubmit={handleCapitalSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                    <ArrowUpRight className="h-5 w-5" />
                    <h3 className="text-lg font-bold">{t('partners.capitalActions') || 'Capital Management'}</h3>
                </div>
                {!capData?.canManage && (
                    <span className="text-xs font-semibold text-amber-700">{t('partners.ceoOnly') || 'CEO only'}</span>
                )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
                {t('partners.capitalDesc') || 'Increase or decrease capital. Every action is routed to approvals and applied only after approval.'}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                    {t('partners.action') || 'Action'}
                    <select
                        value={capitalForm.eventType}
                        onChange={(e) => setCapitalForm((prev) => ({ ...prev, eventType: e.target.value as 'INCREASE' | 'DECREASE' }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        disabled={!capData?.canManage}
                    >
                        <option value="INCREASE">{t('partners.increaseCapital') || 'Increase Capital'}</option>
                        <option value="DECREASE">{t('partners.decreaseCapital') || 'Decrease Capital'}</option>
                    </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                    {t('partners.amount') || 'Amount'}
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={capitalForm.amount}
                        onChange={(e) => setCapitalForm((prev) => ({ ...prev, amount: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        required
                        disabled={!capData?.canManage}
                    />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                    {t('partners.valuation') || 'Valuation'}
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={capitalForm.valuation}
                        onChange={(e) => setCapitalForm((prev) => ({ ...prev, valuation: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        required
                        disabled={!capData?.canManage}
                    />
                </label>
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                    {t('partners.notes') || 'Notes'}
                    <textarea
                        value={capitalForm.notes}
                        onChange={(e) => setCapitalForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                        rows={3}
                        disabled={!capData?.canManage}
                    />
                </label>
            </div>
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>{t('partners.approvalRule') || 'Creates approval and applies only after APPROVED.'}</span>
                </div>
                <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!capData?.canManage || submitting}
                >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} {t('partners.submit') || 'Submit'}
                </button>
            </div>
        </form>
    );

    const equityTransactions = () => (
        <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleEquitySubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800">
                        <ArrowLeftRight className="h-5 w-5" />
                        <h3 className="text-lg font-bold">{t('partners.equityActions') || 'Equity Transactions'}</h3>
                    </div>
                    {!capData?.canManage && <span className="text-xs font-semibold text-amber-700">{t('partners.ceoOnly') || 'CEO only'}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    {t('partners.equityDesc') || 'Issue, transfer, or buy back shares. Calculations use service layer to prevent client-side drift.'}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.action') || 'Action'}
                        <select
                            value={equityForm.transactionType}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, transactionType: e.target.value as EquityFormState['transactionType'] }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            disabled={!capData?.canManage}
                        >
                            <option value="ISSUE">{t('partners.issue') || 'Issue'}</option>
                            <option value="TRANSFER">{t('partners.transfer') || 'Transfer'}</option>
                            <option value="BUYBACK">{t('partners.buyback') || 'Buyback'}</option>
                        </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.shares') || 'Shares'}
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={equityForm.shares}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, shares: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                            disabled={!capData?.canManage}
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.pricePerShare') || 'Price per Share'}
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={equityForm.pricePerShare}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, pricePerShare: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                            disabled={!capData?.canManage}
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.valuation') || 'Valuation'}
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={equityForm.valuation}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, valuation: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            required
                            disabled={!capData?.canManage}
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.fromPartner') || 'From Partner'}
                        <select
                            value={equityForm.fromPartnerId}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, fromPartnerId: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            disabled={!capData?.canManage || equityForm.transactionType === 'ISSUE'}
                        >
                            <option value="">{t('partners.optional') || 'Optional'}</option>
                            {partnerOptions.map((p) => (
                                <option key={p.partnerId} value={p.partnerId}>
                                    {p.partnerName}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        {t('partners.toPartner') || 'To Partner'}
                        <select
                            value={equityForm.toPartnerId}
                            onChange={(e) => setEquityForm((prev) => ({ ...prev, toPartnerId: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                            disabled={!capData?.canManage || equityForm.transactionType === 'BUYBACK'}
                        >
                            <option value="">{t('partners.optional') || 'Optional'}</option>
                            {partnerOptions.map((p) => (
                                <option key={p.partnerId} value={p.partnerId}>
                                    {p.partnerName}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>{t('partners.approvalRule') || 'Creates approval and applies only after APPROVED.'}</span>
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!capData?.canManage || submitting}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />} {t('partners.submit') || 'Submit'}
                    </button>
                </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800">
                    <ShieldCheck className="h-5 w-5" />
                    <h3 className="text-lg font-bold">{t('partners.preview') || 'Preview (not applied until approval)'}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t('partners.previewDesc') || 'Service-side projection of ownership after this transaction.'}</p>
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">{t('partners.name') || 'Partner'}</th>
                                    <th className="px-4 py-3 font-semibold">{t('partners.shares') || 'Shares'}</th>
                                    <th className="px-4 py-3 font-semibold">{t('partners.ownership') || 'Ownership %'}</th>
                                    <th className="px-4 py-3 font-semibold">{t('partners.currentValue') || 'Value'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(preview || capData)?.rows.map((row) => (
                                    <tr key={row.partnerId} className="border-t border-slate-100">
                                        <td className="px-4 py-3 font-semibold text-slate-900">{row.partnerName}</td>
                                        <td className="px-4 py-3 text-slate-700">{row.shares.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-slate-700">{formatPercent(row.ownershipPct)}</td>
                                        <td className="px-4 py-3 text-slate-700">{formatCurrency(row.currentValue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap items-center gap-4">
                            <span>
                                {t('partners.totalShares') || 'Total Shares'}: {(preview || capData)?.summary.totalShares.toLocaleString()}
                            </span>
                            <span>
                                {t('partners.pricePerShare') || 'Price / Share'}: {formatCurrency((preview || capData)?.summary.pricePerShare || 0)}
                            </span>
                            <span>
                                {t('partners.valuation') || 'Valuation'}: {formatCurrency((preview || capData)?.summary.valuation || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const timelineView = () => {
        const getTypeBadge = (type: AuditEvent['eventType']) => {
            if (type === 'EQUITY') return 'bg-blue-50 text-blue-700';
            if (type === 'CAPITAL') return 'bg-amber-50 text-amber-700';
            if (type === 'APPROVAL') return 'bg-emerald-50 text-emerald-700';
            return 'bg-slate-100 text-slate-700';
        };

        const partnerNameById = (id: string | null) => {
            if (!id) return translate('partners.companyWide', 'Company-wide');
            return partnerOptions.find((p) => p.partnerId === id)?.partnerName || translate('partners.partner', 'Partner');
        };

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Clock3 className="h-5 w-5" />
                        <div>
                            <h3 className="text-lg font-bold">{t('partners.timeline') || 'Audit Timeline'}</h3>
                            <p className="text-sm text-slate-500">
                                {t('partners.timelineDesc') || 'Aggregates equity transactions, capital events, approvals, and audit logs with tenant scoping.'}
                            </p>
                        </div>
                    </div>
                    {capData?.canManage && (
                        <select
                            value={timelinePartnerFilter}
                            onChange={(e) => setTimelinePartnerFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                        >
                            <option value="">{t('partners.allPartners') || 'All partners'}</option>
                            {partnerOptions.map((p) => (
                                <option key={p.partnerId} value={p.partnerId}>
                                    {p.partnerName}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {timelineError && (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{timelineError}</span>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    {timelineLoading ? (
                        <div className="p-4"><SkeletonCard className="w-full" /></div>
                    ) : timeline.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">{t('partners.timelineEmpty') || 'No audit entries yet.'}</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {timeline.map((event) => (
                                <div key={`${event.referenceId || event.description}-${event.eventTime}`} className="p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadge(event.eventType)}`}>
                                                {event.eventType}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-800">{event.description}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">{new Date(event.eventTime).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                        {event.approvalStatus && (
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 font-semibold ${event.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : event.approvalStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {event.approvalStatus}
                                            </span>
                                        )}
                                        <span>
                                            {translate('partners.performedBy', 'By')}: {event.performedBy || translate('partners.system', 'System')}
                                        </span>
                                        <span>
                                            {translate('partners.scope', 'Scope')}: {partnerNameById(event.partnerId)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('partners.title') || 'Partners & Capital'}</h1>
                    <p className="text-slate-500">{t('partners.subtitle') || 'Manage partners, cap table, and equity events with approvals.'}</p>
                </div>
                {toast && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{toast}</span>
                    </div>
                )}
            </div>

            {renderTabs()}

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {loading && !capData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {summaryCards()}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    <span>{t('partners.policy') || 'Shares drive ownership. Calculations use approved equity ledger and SQL views.'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cap-table' && capTableView()}

                    {activeTab === 'manage' && managePartners()}

                    {activeTab === 'capital' && capitalManagement()}

                    {activeTab === 'equity' && equityTransactions()}

                    {activeTab === 'timeline' && timelineView()}
                </>
            )}
        </div>
    );
};

export default Partners;
