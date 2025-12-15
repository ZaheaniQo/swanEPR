
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { ApprovalRequest, ApprovalType, Role } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, FileText, CreditCard, DollarSign } from 'lucide-react';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const { showToast, currentUserRole } = useApp();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await dataService.getApprovalRequests();
    setRequests(data);
    setLoading(false);
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (currentUserRole !== Role.CEO) {
        showToast('Only CEO can approve/reject', 'error');
        return;
    }
    
    await dataService.processApproval(id, action);
    showToast(action === 'APPROVE' ? t('msg.approved') : t('msg.rejected'), action === 'APPROVE' ? 'success' : 'info');
    loadData();
  };

  const getTypeIcon = (type: ApprovalType) => {
      switch(type) {
          case ApprovalType.CONTRACT: return <FileText className="text-teal-600" />;
          case ApprovalType.EXPENSE: return <DollarSign className="text-red-600" />;
          case ApprovalType.PAYMENT: return <CreditCard className="text-indigo-600" />;
          case ApprovalType.HIRING: return <User className="text-blue-600" />;
          default: return <Clock className="text-slate-600" />;
      }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const historyRequests = requests.filter(r => r.status !== 'PENDING');

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('approvals.title')}</h1>
            <p className="text-slate-500">{t('approvals.subtitle')}</p>
        </div>

        {/* Pending Requests */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" /> Pending Requests ({pendingRequests.length})
            </h2>
            
            {pendingRequests.length === 0 ? (
                <div className="p-10 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
                    No pending approvals at the moment.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingRequests.map(req => (
                        <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-2 h-full ${req.priority === 'HIGH' ? 'bg-red-500' : req.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    {getTypeIcon(req.type)}
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${req.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {req.priority}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">{req.title}</h3>
                            <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{req.description}</p>
                            
                            <div className="text-xs text-slate-400 mb-6 flex justify-between">
                                <span>By: {req.requesterName}</span>
                                <span>{req.date}</span>
                            </div>

                            {req.amount && (
                                <div className="mb-4 text-xl font-bold text-slate-800">
                                    {req.amount.toLocaleString()} <span className="text-xs font-normal text-slate-500">SAR</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleAction(req.id, 'REJECT')}
                                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50"
                                >
                                    {t('btn.reject')}
                                </button>
                                <button 
                                    onClick={() => handleAction(req.id, 'APPROVE')}
                                    className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 shadow-lg shadow-teal-200"
                                >
                                    {t('btn.approve')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* History */}
        <div className="pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-slate-400" /> History
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                            <th className="p-4">Request</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historyRequests.map(req => (
                            <tr key={req.id}>
                                <td className="p-4 font-medium text-slate-800">{req.title}</td>
                                <td className="p-4 text-slate-500">{req.type}</td>
                                <td className="p-4 text-slate-500">{req.date}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {req.status === 'APPROVED' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                        {req.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {historyRequests.length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-slate-400">No history available.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Approvals;
