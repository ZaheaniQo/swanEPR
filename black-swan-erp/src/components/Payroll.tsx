
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../AppContext';
import { erpService } from '../services/supabase/erp.service';
import { PayrollRun, Employee } from '../types';
import { dataService } from '../services/dataService';
import { PageHeader } from './ui/PageHeader';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Users, DollarSign, Calendar, FileText, Play } from 'lucide-react';

const Payroll: React.FC = () => {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [runsData, empsData] = await Promise.all([
        erpService.getPayrollRuns(),
        dataService.getEmployees()
      ]);
      setRuns(runsData);
      setEmployees(empsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    const today = new Date();
    await erpService.createPayrollRun(today.getMonth() + 1, today.getFullYear());
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('menu.payroll') || 'Payroll'} 
        subtitle={t('payroll.subtitle') || 'Manage salaries and payslips'}
        actions={
          <Button onClick={handleRunPayroll} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Play size={16} /> {t('payroll.run') || 'Run Payroll'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Total Employees</p>
              <h3 className="text-2xl font-bold mt-1">{employees.length}</h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Last Month Total</p>
              <h3 className="text-2xl font-bold mt-1">
                {runs.length > 0 ? runs[0].totalAmount.toLocaleString() : '0'} SAR
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <DollarSign size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card title="Payroll History">
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
                <tr key={run.id} className="hover:bg-secondary/50">
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
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        <FileText size={14} /> Details
                    </Button>
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
    </div>
  );
};

export default Payroll;
