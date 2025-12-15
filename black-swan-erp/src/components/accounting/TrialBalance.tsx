import React, { useEffect, useState } from 'react';
import { accountingService } from '../../services/supabase/accounting.service';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';

export const TrialBalance: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const report = await accountingService.getTrialBalance();
      setData(report);
    } catch (error) {
      console.error('Failed to load trial balance', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = data.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = data.reduce((sum, row) => sum + row.credit, 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Trial Balance" 
        subtitle="Summary of all ledger account balances"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">No data available</td></tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.debit > 0 ? row.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.credit > 0 ? row.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {row.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right">Totals:</td>
                <td className="px-6 py-4 text-right">{totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="px-6 py-4 text-right">{totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="px-6 py-4 text-right">{(totalDebit - totalCredit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
