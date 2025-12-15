
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { ApprovalRequest, ApprovalType, Role } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, User, 
  FileText, CreditCard, DollarSign, RefreshCw, ArrowUpRight, 
  ShieldCheck, AlertCircle
} from 'lucide-react';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

  const isApprover = currentUserRole === Role.CEO || currentUserRole === Role.PARTNER;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getApprovalRequests();
      setRequests(data);
    } catch (error) {
      console.error(error);
      showToast(t('msg.errorLoading') || 'Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (req: ApprovalRequest, action: 'APPROVE' | 'REJECT') => {
    if (!isApprover) {
        showToast('Permission Denied: Only CEO can approve', 'error');
        return;
    }
    
    setProcessingId(req.id);
    try {
        await dataService.processApproval(req.id, action);
        showToast(action === 'APPROVE' ? t('msg.approved') : t('msg.rejected'), action === 'APPROVE' ? 'success' : 'info');
        loadData();
    } catch (e: any) {
        showToast(e.message || 'Action Failed', 'error');
    } finally {
        setProcessingId(null);
    }
  };

  const getTypeStyles = (type: ApprovalType) => {
      switch(type) {
          case ApprovalType.CONTRACT: return { icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' };
          case ApprovalType.EXPENSE: return { icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' };
          case ApprovalType.PAYMENT: return { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' };
          case ApprovalType.INVOICE: return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
          case ApprovalType.HIRING: return { icon: User, color: 'text-purple-600', bg: 'bg-purple-50' };
          default: return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' };
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

  const filteredRequests = requests.filter(r => 
      activeTab === 'PENDING' ? r.status === 'PENDING' : r.status !== 'PENDING'
  );

  return (
    <div className="space-y-6">
        <PageHeader 
            title={t('approvals.title')} 
            subtitle={t('approvals.subtitle')}
            actions={
                <Button variant="outline" onClick={loadData} disabled={loading} size="sm">
                    <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            }
        />

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border">
            <button 
                onClick={() => setActiveTab('PENDING')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'PENDING' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
            >
                <AlertTriangle size={16} /> Pending ({requests.filter(r => r.status === 'PENDING').length})
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'HISTORY' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
            >
                <Clock size={16} /> History
            </button>
        </div>

        {/* List */}
        <div className="space-y-4">
            {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-xl border border-border">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-text">No requests found</h3>
                    <p className="text-text-muted">You're all caught up!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map(req => {
                        const style = getTypeStyles(req.type);
                        const Icon = style.icon;
                        
                        return (
                            <Card key={req.id} className="hover:shadow-md transition-shadow relative overflow-hidden group border border-border">
                                {req.priority === 'HIGH' && activeTab === 'PENDING' && (
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-danger"></div>
                                )}
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${style.bg} ${style.color}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {req.priority === 'HIGH' && activeTab === 'PENDING' && (
                                                <Badge variant="danger">High Priority</Badge>
                                            )}
                                            {activeTab === 'HISTORY' && (
                                                <Badge variant={req.status === 'APPROVED' ? 'success' : 'danger'}>
                                                    {req.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-text text-lg mb-1 line-clamp-1">{req.title}</h3>
                                    <p className="text-text-muted text-sm mb-4 line-clamp-2 h-10">{req.description}</p>

                                    <div className="flex justify-between items-center text-xs text-text-muted mb-6 bg-secondary/30 p-3 rounded-lg">
                                        <div className="flex items-center gap-1">
                                            <User size={12}/> {req.requesterName}
                                        </div>
                                        <div>{new Date(req.date).toLocaleDateString()}</div>
                                    </div>

                                    {req.amount && (
                                        <div className="mb-6">
                                            <p className="text-xs text-text-muted uppercase font-bold">Amount</p>
                                            <p className="text-xl font-bold text-text">{req.amount.toLocaleString()} <span className="text-sm font-normal text-text-muted">SAR</span></p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {req.status === 'PENDING' ? (
                                            <>
                                                <Button 
                                                    variant="danger"
                                                    className="flex-1 opacity-90 hover:opacity-100"
                                                    onClick={() => handleAction(req, 'REJECT')}
                                                    loading={processingId === req.id}
                                                    disabled={!!processingId}
                                                >
                                                    Reject
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    className="flex-1"
                                                    onClick={() => handleAction(req, 'APPROVE')}
                                                    loading={processingId === req.id}
                                                    disabled={!!processingId}
                                                >
                                                    Approve
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="w-full text-center text-sm font-medium text-text-muted flex items-center justify-center gap-2 bg-secondary/50 py-2 rounded-lg">
                                                {req.status === 'APPROVED' ? <CheckCircle size={16} className="text-success"/> : <XCircle size={16} className="text-danger"/>}
                                                <span>Processed</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {req.relatedEntityId && req.type === ApprovalType.INVOICE && (
                                        <button 
                                            onClick={() => navigateToEntity(req)}
                                            className="w-full mt-3 text-xs font-bold text-primary flex items-center justify-center gap-1 hover:underline"
                                        >
                                            View Details <ArrowUpRight size={12} />
                                        </button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default Approvals;
