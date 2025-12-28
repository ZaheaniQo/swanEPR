import { AlertCircle, Calendar, CheckCircle, DollarSign, FileText, Play, Users } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useApp, useTranslation } from '../AppContext';
import { dataService } from '../services/dataService';
import { erpService } from '../services/supabase/erp.service';
import { Employee, PayrollRun, Payslip } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

const Payroll: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [previewPayslips, setPreviewPayslips] = useState<Payslip[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingSlips, setIsLoadingSlips] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [runsData, empsData] = await Promise.all([
        erpService.getPayrollRuns(),
        dataService.getEmployees(),
      ]);
      setRuns(runsData);
      setEmployees(empsData);
      if (runsData.length) {
        setSelectedRunId(runsData[0].id);
        const slips = await erpService.getPayslips(runsData[0].id);
        setPayslips(slips);
      } else {
        setPayslips([]);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('تعذر تحميل بيانات الرواتب');
      showToast('تعذر تحميل بيانات الرواتب', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunPayroll = async () => {
    if (!employees.length) {
      showToast('لا يوجد موظفون لتشغيل الرواتب', 'error');
      return;
    }
    const today = new Date();
    try {
      setIsRunning(true);
      const run = await erpService.createPayrollRun(selectedMonth, selectedYear || today.getFullYear());
      showToast(t('msg.saved') || 'Saved', 'success');
      await loadData();
      setSelectedRunId(run.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to run payroll', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    setIsLoadingSlips(true);
    try {
      const slips = await erpService.getPayslips(runId);
      setPayslips(slips);
    } catch (err) {
      console.error(err);
      showToast('تعذر تحميل مسيرات الرواتب', 'error');
    } finally {
      setIsLoadingSlips(false);
    }
  };

  const handleMarkPaid = async (runId: string) => {
    const ok = window.confirm('تأكيد دفع هذا المسير وتسجيل قيد الرواتب؟');
    if (!ok) return;
    try {
      setIsPaying(true);
      await erpService.markPayrollRunPaid(runId);
      showToast(t('msg.saved') || 'Saved', 'success');
      await loadData();
      setSelectedRunId(runId);
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const latestTotal = runs.length ? runs[0].totalAmount : 0;
    const pendingRuns = runs.filter(r => r.status !== 'PAID').length;
    return { totalEmployees, latestTotal, pendingRuns };
  }, [employees.length, runs]);

  const handlePreview = async () => {
    try {
      setIsLoadingSlips(true);
      const draft = await erpService.previewPayrollRun(selectedMonth, selectedYear);
      setPreviewPayslips(draft.payslips.map((p: any) => ({
        id: p.id || crypto.randomUUID(),
        payrollRunId: '',
        employeeId: p.employee_id,
        basicSalary: p.basic_salary,
        totalAllowances: p.total_allowances,
        totalDeductions: p.total_deductions,
        netSalary: p.net_salary,
        status: p.status,
        employeeName: p.employee_name
      })));
      setPreviewTotal(draft.totalAmount);
      showToast('تم حساب المعاينة', 'success');
    } catch (err: any) {
      showToast(err.message || 'تعذر حساب المعاينة', 'error');
    } finally {
      setIsLoadingSlips(false);
    }
  };

  const handleExportCsv = () => {
    const rows = (selectedRunId ? payslips : previewPayslips).map(p => ({
      employee: p.employeeName || p.employeeId,
      allowances: p.totalAllowances,
      deductions: p.totalDeductions,
      net: p.netSalary,
      status: p.status
    }));
    if (!rows.length) {
      showToast('لا توجد بيانات للتصدير', 'error');
      return;
    }
    const header = ['Employee', 'Allowances', 'Deductions', 'Net', 'Status'];
    const csv = [header.join(','), ...rows.map(r => `${r.employee},${r.allowances},${r.deductions},${r.net},${r.status}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslips_${selectedRunId || 'preview'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('menu.payroll') || 'Payroll'} 
        subtitle={t('payroll.subtitle') || 'Manage salaries and payslips'}
        actions={
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
            </select>
            <input className="border rounded px-2 py-1 text-sm w-20" type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} />
            <Button variant="outline" onClick={handlePreview} disabled={isLoadingSlips} className="flex items-center gap-2">
              <FileText size={14}/> معاينة
            </Button>
            <Button variant="outline" onClick={handleExportCsv} className="flex items-center gap-2">
              تصدير CSV
            </Button>
            <Button onClick={handleRunPayroll} disabled={isRunning || !employees.length} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
              <Play size={16} /> {isRunning ? (t('payroll.running') || 'Processing...') : (t('payroll.run') || 'Run Payroll')}
            </Button>
          </div>
        }
      />

      {errorMsg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Employees</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalEmployees}</h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Latest Payroll</p>
              <h3 className="text-2xl font-bold mt-1">{stats.latestTotal.toLocaleString()} SAR</h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <DollarSign size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Pending Runs</p>
              <h3 className="text-2xl font-bold mt-1">{stats.pendingRuns}</h3>
            </div>
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
              <AlertCircle size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Preview Total</p>
              <h3 className="text-2xl font-bold mt-1">{previewTotal.toLocaleString()} SAR</h3>
            </div>
            <div className="p-3 bg-violet-100 text-violet-600 rounded-full">
              <DollarSign size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Payroll History" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary text-text-muted uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Processed At</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id} className={`hover:bg-secondary/50 ${selectedRunId === run.id ? 'bg-secondary/40' : ''}`}>
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <Calendar size={16} className="text-text-muted" />
                      {run.month}/{run.year}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        run.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                        run.status === 'PROCESSED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{run.totalAmount.toLocaleString()} SAR</td>
                    <td className="px-6 py-4 text-text-muted">
                      {run.processedAt ? new Date(run.processedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleSelectRun(run.id)} className="flex items-center gap-1">
                          <FileText size={14} /> View slips
                      </Button>
                      {run.status !== 'PAID' && (
                        <Button variant="outline" size="sm" disabled={isPaying} onClick={() => handleMarkPaid(run.id)} className="flex items-center gap-1">
                          <CheckCircle size={14} /> {isPaying ? 'Updating...' : 'Mark Paid'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                      No payroll runs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Payslips">
          <div className="overflow-y-auto max-h-[520px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary text-text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Allowances</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingSlips && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-muted">جار التحميل...</td>
                  </tr>
                )}
                {!isLoadingSlips && (selectedRunId ? payslips : previewPayslips).map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.employeeName || p.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-700">{p.totalAllowances.toLocaleString()} SAR</td>
                    <td className="px-4 py-3 font-mono text-amber-700">{p.totalDeductions.toLocaleString()} SAR</td>
                    <td className="px-4 py-3 font-mono">{p.netSalary.toLocaleString()} SAR</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!isLoadingSlips && (selectedRunId ? payslips.length === 0 : previewPayslips.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-muted">Select a payroll run to view payslips.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Payroll;
