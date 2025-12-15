
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { erpService } from '../services/supabase/erp.service';
import { Project, ProjectStageStatus, Role, Disbursement, WorkOrder, BillOfMaterials } from '../types';
import { Factory, CheckCircle, Clock, AlertCircle, Play, Package, TrendingDown, Layers, ClipboardList } from 'lucide-react';
import { Button } from './ui/Button';

const Production: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast, currentUserRole } = useApp();
  const [activeTab, setActiveTab] = useState<'projects' | 'work_orders' | 'boms'>('projects');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, disbsData, woData, bomData] = await Promise.all([
        dataService.getProjects(),
        dataService.getDisbursements(),
        erpService.getWorkOrders(),
        erpService.getBOMs()
      ]);
      setProjects(projData);
      setDisbursements(disbsData.items);
      setWorkOrders(woData);
      setBoms(bomData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (projectId: string, stageId: string, status: ProjectStageStatus) => {
      if (currentUserRole !== Role.PRODUCTION_MANAGER && currentUserRole !== Role.CEO && currentUserRole !== Role.WAREHOUSE) {
          showToast("Permission Denied", "error");
          return;
      }
      await dataService.updateStageStatus(projectId, stageId, status);
      showToast(t('msg.saved'), "success");
      loadData();
  };

  const getStageStyles = (status: ProjectStageStatus) => {
      switch(status) {
          case ProjectStageStatus.COMPLETED: 
            return 'bg-emerald-500 text-white border-emerald-500 ring-emerald-200';
          case ProjectStageStatus.IN_PROGRESS: 
            return 'bg-white border-blue-500 text-blue-600 ring-blue-100 animate-pulse';
          case ProjectStageStatus.DELAYED: 
            return 'bg-red-50 border-red-500 text-red-600 ring-red-100';
          default: 
            return 'bg-slate-50 border-slate-300 text-slate-400 ring-slate-100';
      }
  };

  const getStageIcon = (status: ProjectStageStatus) => {
      switch(status) {
          case ProjectStageStatus.COMPLETED: return <CheckCircle size={14} />;
          case ProjectStageStatus.IN_PROGRESS: return <Clock size={14} className="animate-spin-slow" />;
          case ProjectStageStatus.DELAYED: return <AlertCircle size={14} />;
          default: return <div className="w-3.5 h-3.5 rounded-full bg-slate-300" />;
      }
  };

  const handleCompleteWO = async (id: string) => {
      if (!window.confirm(t('msg.confirmComplete') || 'Are you sure you want to complete this work order? This will consume raw materials and post accounting entries.')) return;
      
      try {
          await erpService.updateWorkOrderStatus(id, 'COMPLETED');
          showToast(t('msg.saved'), 'success');
          loadData();
      } catch (error: any) {
          console.error(error);
          showToast(error.message || t('msg.error'), 'error');
      }
  };

  if (loading) return (
      <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('production.title')}</h1>
            <p className="text-slate-500">{t('production.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant={activeTab === 'projects' ? 'primary' : 'outline'} 
                onClick={() => setActiveTab('projects')}
            >
                Projects
            </Button>
            <Button 
                variant={activeTab === 'work_orders' ? 'primary' : 'outline'} 
                onClick={() => setActiveTab('work_orders')}
            >
                Work Orders
            </Button>
            <Button 
                variant={activeTab === 'boms' ? 'primary' : 'outline'} 
                onClick={() => setActiveTab('boms')}
            >
                BOMs
            </Button>
        </div>
      </div>

      {activeTab === 'projects' && (
      <div className="grid grid-cols-1 gap-6">
        {projects.map((project) => {
            const projectExpenses = disbursements.filter(d => d.projectId === project.id);
            const totalProjectCost = projectExpenses.reduce((sum, d) => sum + d.amount, 0);

            return (
            <div key={project.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-100 text-teal-700 rounded-xl">
                            <Factory size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                            <p className="text-sm text-slate-500">#{project.contractId}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                         <div className="text-right">
                             <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t('production.projectCost')}</p>
                             <p className="text-lg font-bold text-red-600">-{totalProjectCost.toLocaleString()} {t('currency')}</p>
                         </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t('production.progress')}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-slate-800">{project.progress}%</span>
                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden" dir="ltr">
                                    <div 
                                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500" 
                                        style={{ width: `${project.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Stepper Pipeline */}
                <div className="p-8 overflow-x-auto">
                    <div className="flex items-center min-w-[700px] justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
                        
                        {project.stages.map((stage, index) => {
                            const isActive = stage.status === ProjectStageStatus.IN_PROGRESS;
                            return (
                                <div key={stage.id} className="relative flex flex-col items-center group">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300 ${getStageStyles(stage.status)}`}>
                                        {getStageIcon(stage.status)}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className={`font-bold text-sm ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>{t(`stage.${stage.name}`)}</p>
                                        <p className="text-xs text-slate-400 mt-1">{stage.status}</p>
                                    </div>
                                    {/* Hover Actions */}
                                    <div className="absolute top-14 mt-8 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 bg-white p-2 rounded-lg shadow-xl border border-slate-100 z-20 min-w-[120px]">
                                        {stage.status === ProjectStageStatus.PENDING && (
                                            <button 
                                                onClick={() => handleStageUpdate(project.id, stage.id, ProjectStageStatus.IN_PROGRESS)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md w-full"
                                            >
                                                <Play size={12} /> {t('stage.start')}
                                            </button>
                                        )}
                                        {stage.status === ProjectStageStatus.IN_PROGRESS && (
                                            <button 
                                                onClick={() => handleStageUpdate(project.id, stage.id, ProjectStageStatus.COMPLETED)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md w-full"
                                            >
                                                <CheckCircle size={12} /> {t('stage.complete')}
                                            </button>
                                        )}
                                        {stage.status !== ProjectStageStatus.COMPLETED && (
                                            <button 
                                                onClick={() => handleStageUpdate(project.id, stage.id, ProjectStageStatus.DELAYED)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md w-full"
                                            >
                                                <AlertCircle size={12} /> {t('stage.delay')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Project Expenses Table (If any) */}
                {projectExpenses.length > 0 && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><TrendingDown size={16}/> {t('production.projectExpenses')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectExpenses.map(exp => (
                                <div key={exp.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-bold text-slate-800">{exp.category}</p>
                                        <p className="text-xs text-slate-500">{exp.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600">-{exp.amount.toLocaleString()}</p>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{exp.approvalStatus}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )})}

        {projects.length === 0 && (
             <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Package size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">{t('production.noProjects')}</h3>
             </div>
        )}
      </div>
      )}

      {activeTab === 'work_orders' && (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button variant="primary" onClick={() => navigate('/production/work-orders/new')}>
                    + New Work Order
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {workOrders.map(wo => (
                    <div key={wo.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-slate-800">{wo.number}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                    wo.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {wo.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">BOM: {boms.find(b => b.id === wo.bomId)?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 mt-1">Due: {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">Qty: {wo.quantityPlanned}</p>
                            <p className="text-xs text-slate-500 mb-2">Produced: {wo.quantityProduced}</p>
                            {wo.status !== 'COMPLETED' && (
                                <Button size="sm" variant="outline" onClick={() => handleCompleteWO(wo.id)}>
                                    <CheckCircle size={14} className="mr-1" /> Complete
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
                {workOrders.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No work orders found</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'boms' && (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button variant="primary" onClick={() => navigate('/production/boms/new')}>
                    + New BOM
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boms.map(bom => (
                    <div key={bom.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800">{bom.name}</h3>
                                <p className="text-xs text-slate-500">{bom.code}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${bom.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {bom.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Version</span>
                                <span className="font-medium">{bom.version}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Output Qty</span>
                                <span className="font-medium">{bom.outputQuantity} {bom.uom}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {boms.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No Bill of Materials found</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Production;
