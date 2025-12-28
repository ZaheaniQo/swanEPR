
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { ApprovalRequest, ApprovalType, Role, AccessRequest } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    User,
    FileText,
    CreditCard,
    DollarSign,
    RefreshCw,
    ArrowUpRight,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const navigate = useNavigate();
  
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [typeFilter, setTypeFilter] = useState<'ALL' | ApprovalType>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
    const [search, setSearch] = useState('');
    const [lastSync, setLastSync] = useState<string>('');

    const isApprover = currentUserRole === Role.CEO || currentUserRole === Role.PARTNER || currentUserRole === Role.ACCOUNTING;

  useEffect(() => {
    loadData();
  }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await dataService.getApprovalRequests();
            setRequests(data);
            setLastSync(new Date().toISOString());
        } catch (error) {
            console.error(error);
            showToast(t('msg.errorLoading') || 'Error loading data', 'error');
        } finally {
            setLoading(false);
        }

        try {
            const access = await dataService.getPendingAccessRequests();
            setAccessRequests(access);
        } catch (err) {
            console.error(err);
        }
    };

        const handleAccessAction = async (req: AccessRequest, action: 'APPROVE' | 'REJECT', role?: Role) => {
                setProcessingId(req.id);
                try {
                        if (action === 'APPROVE') {
                                await dataService.activateUserProfile(req.id, role || Role.PARTNER);
                                showToast(t('msg.approved') || 'Approved');
                        } else {
                                await dataService.rejectUserProfile(req.id);
                                showToast(t('msg.rejected') || 'Rejected', 'info');
                        }
                        await loadData();
                } catch (e: any) {
                        showToast(e?.message || t('msg.actionFailed') || 'Action failed', 'error');
                } finally {
                        setProcessingId(null);
                }
        };

    const handleAction = async (req: ApprovalRequest, action: 'APPROVE' | 'REJECT') => {
        if (!isApprover) {
            showToast(t('msg.permissionDenied'), 'error');
            return;
        }

        setProcessingId(req.id);
        try {
            await dataService.processApproval(req.id, action);
            showToast(action === 'APPROVE' ? t('msg.approved') : t('msg.rejected'), action === 'APPROVE' ? 'success' : 'info');
            loadData();
        } catch (e: any) {
            showToast(e.message || t('msg.actionFailed'), 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const getTypeStyles = (type: ApprovalType) => {
        switch (type) {
            case ApprovalType.CONTRACT:
                return { icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' };
            case ApprovalType.EXPENSE:
                return { icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' };
            case ApprovalType.PAYMENT:
                return { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' };
            case ApprovalType.INVOICE:
                return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
            case ApprovalType.HIRING:
                return { icon: User, color: 'text-purple-600', bg: 'bg-purple-50' };
            default:
                return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' };
        }
    };

  const navigateToEntity = (req: ApprovalRequest) => {
      if (!req.relatedEntityId) return;
      
      switch(req.type) {
          case ApprovalType.INVOICE: 
              navigate(`/invoices/${req.relatedEntityId}`); 
              break;
          // Add navigation logic for other types if they have detailed views
          default:
              break;
      }
  };

    const filteredRequests = useMemo(() => {
        const base = activeTab === 'PENDING'
            ? requests.filter((r) => r.status === 'PENDING')
            : requests.filter((r) => r.status !== 'PENDING');
        const byType = typeFilter === 'ALL' ? base : base.filter((r) => r.type === typeFilter);
        const byPriority = priorityFilter === 'ALL' ? byType : byType.filter((r) => (r.priority || 'MEDIUM') === priorityFilter);
        const bySearch = search
            ? byPriority.filter((r) =>
                (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
                (r.requesterName || '').toLowerCase().includes(search.toLowerCase()) ||
                (r.description || '').toLowerCase().includes(search.toLowerCase())
            )
            : byPriority;
        const rank = (p?: string) => (p === 'HIGH' ? 0 : p === 'MEDIUM' ? 1 : 2);
        return [...bySearch].sort(
            (a, b) => rank(a.priority) - rank(b.priority) || new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }, [activeTab, requests, typeFilter, priorityFilter, search]);

    const pendingCount = useMemo(() => requests.filter((r) => r.status === 'PENDING').length, [requests]);
    const approvedCount = useMemo(() => requests.filter((r) => r.status === 'APPROVED').length, [requests]);
    const rejectedCount = useMemo(() => requests.filter((r) => r.status === 'REJECTED').length, [requests]);
    const historyCount = useMemo(() => requests.length - pendingCount, [requests, pendingCount]);

    const getStatusLabel = (status: ApprovalRequest['status']) => {
            switch (status) {
                    case 'PENDING': return t('approvals.status.pending');
                    case 'APPROVED': return t('approvals.status.approved');
                    case 'REJECTED': return t('approvals.status.rejected');
                    default: return status;
            }
    };

  return (
    <div className="space-y-6">
            <PageHeader
                title={t('approvals.title')}
                subtitle={t('approvals.subtitle')}
                actions={
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        {lastSync && <span>{t('dashboard.updated') || 'Updated'}: {new Date(lastSync).toLocaleTimeString()}</span>}
                        <Button variant="outline" onClick={loadData} disabled={loading} size="sm">
                            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('btn.refresh') || 'Refresh'}
                        </Button>
                    </div>
                }
            />

            {accessRequests.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-text flex items-center gap-2"><ShieldCheck size={16} /> {t('approvals.accessRequests') || 'Access Requests'}</h3>
                        <Badge variant="warning">{accessRequests.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {accessRequests.map((req) => (
                            <div key={req.id} className="border border-border rounded-lg p-3 bg-secondary/30 flex flex-col gap-2">
                                <div className="font-bold text-text">{req.fullName || req.email}</div>
                                <div className="text-sm text-text-muted">{req.email}</div>
                                <div className="text-xs text-text-muted">{new Date(req.createdAt || '').toLocaleString()}</div>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleAccessAction(req, 'APPROVE', Role.PARTNER)}
                                        disabled={!!processingId}
                                        loading={processingId === req.id}
                                    >
                                        {t('btn.approve') || 'Approve'}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleAccessAction(req, 'REJECT')}
                                        disabled={!!processingId}
                                        loading={processingId === req.id}
                                    >
                                        {t('btn.reject') || 'Reject'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted font-bold uppercase">{t('approvals.pending') || 'Pending'}</p>
                            <p className="text-2xl font-bold">{pendingCount}</p>
                        </div>
                        <AlertTriangle className="text-amber-500" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted font-bold uppercase">{t('approvals.approved') || 'Approved'}</p>
                            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
                        </div>
                        <ShieldCheck className="text-emerald-500" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-text-muted font-bold uppercase">{t('approvals.rejected') || 'Rejected'}</p>
                            <p className="text-2xl font-bold text-rose-600">{rejectedCount}</p>
                        </div>
                        <AlertCircle className="text-rose-500" />
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <p className="text-sm text-text-muted">
                    {isApprover
                        ? t('approvals.helperApprover') || 'You can approve or reject pending requests.'
                        : t('approvals.helperViewer') || 'You can view requests but approvals are restricted to approvers.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <input
                        className="border border-border rounded-lg px-3 py-2 bg-surface text-sm w-full sm:w-56"
                        placeholder={t('search.placeholder') || 'Search'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="border border-border rounded-lg px-3 py-2 bg-surface text-sm w-full sm:w-40"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'ALL' | ApprovalType)}
                    >
                        <option value="ALL">{t('approvals.allTypes') || 'All types'}</option>
                        <option value={ApprovalType.INVOICE}>{t('approvals.typeInvoice') || 'Invoice'}</option>
                        <option value={ApprovalType.PAYMENT}>{t('approvals.typePayment') || 'Payment'}</option>
                        <option value={ApprovalType.EXPENSE}>{t('approvals.typeExpense') || 'Expense'}</option>
                        <option value={ApprovalType.CONTRACT}>{t('approvals.typeContract') || 'Contract'}</option>
                        <option value={ApprovalType.HIRING}>{t('approvals.typeHiring') || 'Hiring'}</option>
                    </select>
                    <select
                        className="border border-border rounded-lg px-3 py-2 bg-surface text-sm w-full sm:w-36"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH')}
                    >
                        <option value="ALL">{t('approvals.allPriorities') || 'All priorities'}</option>
                        <option value="HIGH">{t('approvals.priorityHigh') || 'High'}</option>
                        <option value="MEDIUM">{t('approvals.priorityMedium') || 'Medium'}</option>
                        <option value="LOW">{t('approvals.priorityLow') || 'Low'}</option>
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'PENDING' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                    <AlertTriangle size={16} />
                    <span>{t('approvals.tabPending') || 'Pending'} ({pendingCount})</span>
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'HISTORY' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                    <Clock size={16} />
                    <span>{t('approvals.tabHistory') || 'History'} ({historyCount})</span>
                </button>
            </div>

        {/* List */}
        <div className="space-y-4">
            {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-xl border border-border">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                        <CheckCircle size={32} />
                    </div>
                            <h3 className="text-lg font-bold text-text">{t('approvals.emptyTitle') || 'No requests found'}</h3>
                            <p className="text-text-muted">{t('approvals.emptySubtitle') || "You're all caught up!"}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <div className="hidden lg:grid grid-cols-12 px-4 py-3 text-xs font-bold text-text-muted border-b border-border uppercase">
                        <span className="col-span-4">{t('approvals.title') || 'Title'}</span>
                        <span className="col-span-2">{t('approvals.type') || 'Type'}</span>
                        <span className="col-span-2">{t('approvals.requester') || 'Requester'}</span>
                        <span className="col-span-1 text-right">{t('approvals.amount') || 'Amount'}</span>
                        <span className="col-span-1 text-center">{t('approvals.status') || 'Status'}</span>
                        <span className="col-span-2 text-center">{t('approvals.date') || 'Date'}</span>
                    </div>
                    <div className="divide-y divide-border">
                        {filteredRequests.map((req) => {
                            const style = getTypeStyles(req.type);
                            const Icon = style.icon;
                            return (
                                <div key={req.id} className="px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center hover:bg-secondary/30">
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${style.bg} ${style.color}`}><Icon size={18} /></div>
                                        <div>
                                            <p className="font-semibold text-text line-clamp-1">{req.title}</p>
                                            <p className="text-xs text-text-muted line-clamp-2">{req.description}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-text">
                                        <Badge variant="outline">{t(`approvals.type.${req.type?.toLowerCase()}`) || req.type}</Badge>
                                        {req.priority === 'HIGH' && activeTab === 'PENDING' && <Badge variant="danger">{t('approvals.priorityHigh') || 'High'}</Badge>}
                                    </div>
                                    <div className="col-span-2 text-sm text-text flex items-center gap-2">
                                        <User size={14} className="text-text-muted" />
                                        <span>{req.requesterName || '-'}</span>
                                    </div>
                                    <div className="col-span-1 text-right text-sm font-bold text-text">{req.amount ? `${req.amount.toLocaleString()} ${t('currency')}` : '--'}</div>
                                    <div className="col-span-1 flex justify-center">
                                        <Badge variant={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}>
                                            {getStatusLabel(req.status)}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2 text-center text-sm text-text-muted">{new Date(req.date).toLocaleDateString()}</div>

                                    <div className="col-span-12 flex flex-wrap gap-2 justify-end">
                                        {req.status === 'PENDING' ? (
                                            <>
                                                <Button 
                                                    variant="danger"
                                                    className="min-w-[120px]"
                                                    onClick={() => handleAction(req, 'REJECT')}
                                                    loading={processingId === req.id}
                                                    disabled={!!processingId || !isApprover}
                                                >
                                                    {t('btn.reject') || 'Reject'}
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    className="min-w-[120px]"
                                                    onClick={() => handleAction(req, 'APPROVE')}
                                                    loading={processingId === req.id}
                                                    disabled={!!processingId || !isApprover}
                                                >
                                                    {t('btn.approve') || 'Approve'}
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="px-3 py-2 rounded-lg bg-secondary/60 text-sm font-medium text-text flex items-center gap-2">
                                                {req.status === 'APPROVED' ? <CheckCircle size={16} className="text-success"/> : <XCircle size={16} className="text-danger"/>}
                                                <span>{t('approvals.processed') || 'Processed'}</span>
                                            </div>
                                        )}

                                        {req.relatedEntityId && req.type === ApprovalType.INVOICE && (
                                            <button 
                                                onClick={() => navigateToEntity(req)}
                                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                                            >
                                                {t('approvals.viewDetails') || 'View Details'} <ArrowUpRight size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Approvals;
