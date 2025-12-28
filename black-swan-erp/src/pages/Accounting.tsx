
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, Plus, Filter, PieChart } from 'lucide-react';
import { useTranslation } from '../AppContext';
import { useAccounting } from '../domain/hooks/useAccounting';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const Accounting: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices' | 'expenses'>('ledger');
    const { ledger, invoices, expenses, loadSnapshot } = useAccounting();

    useEffect(() => {
        loadSnapshot();
    }, [loadSnapshot]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('accounting.title')} 
        subtitle={t('accounting.subtitle')}
        actions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/accounting/trial-balance')}>
                    <FileText size={18} className="mr-2" /> Trial Balance
                </Button>
                <Button onClick={() => navigate('/accounting/entries/new')}>
                    <Plus size={18} className="mr-2" /> {t('accounting.newEntry')}
                </Button>
            </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border mb-4">
        <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
            <FileText size={16} /> {t('tab.ledger')}
        </button>
        <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
            <DollarSign size={16} /> {t('tab.invoices')}
        </button>
        <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
            <PieChart size={16} /> {t('tab.expenses')}
        </button>
      </div>

      <Card>
          {activeTab === 'ledger' && (
              <div>
                  <div className="p-4 border-b border-border bg-secondary/10 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-text-muted text-sm">
                          <Filter size={14} /> {t('accounting.filterDept')}
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                            <tr>
                                <th className="px-4 py-3">{t('col.date')}</th>
                                <th className="px-4 py-3">{t('col.docNo')}</th>
                                <th className="px-4 py-3 w-1/3">{t('col.description')}</th>
                                <th className="px-4 py-3">{t('col.dept')}</th>
                                <th className="px-4 py-3 text-right text-success">{t('col.debit')}</th>
                                <th className="px-4 py-3 text-right text-danger">{t('col.credit')}</th>
                                <th className="px-4 py-3 text-right">{t('col.balance')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {ledger.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-text-muted">{t('noData')}</td></tr>
                            ) : (
                                ledger.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-secondary/30">
                                        <td className="px-4 py-3 font-mono text-xs text-text-muted">{entry.date}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{entry.documentNumber}</td>
                                        <td className="px-4 py-3 font-medium text-text">
                                            {entry.description}
                                            {entry.contractId && <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded text-text-muted">#{entry.contractId}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{entry.department || '-'}</td>
                                        <td className="px-4 py-3 text-right font-medium text-success">
                                            {entry.type === 'DEBIT' ? `+${entry.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-danger">
                                            {entry.type === 'CREDIT' ? `-${entry.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-text bg-secondary/10">
                                            {entry.balance?.toLocaleString()} {t('currency')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}

          {activeTab === 'invoices' && (
              <table className="w-full text-left text-sm">
                  <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                      <tr>
                          <th className="px-6 py-4">{t('col.invoiceNo')}</th>
                          <th className="px-6 py-4">{t('col.date')}</th>
                          <th className="px-6 py-4">{t('col.customer')}</th>
                          <th className="px-6 py-4">{t('invoices.type')}</th>
                          <th className="px-6 py-4 text-right">{t('col.total')}</th>
                          <th className="px-6 py-4 text-center">{t('col.status')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                              <td className="px-6 py-4 font-mono text-text-muted">{inv.invoiceNumber}</td>
                              <td className="px-6 py-4 text-text-muted">{inv.issueDate?.split('T')[0]}</td>
                              <td className="px-6 py-4 font-medium">{(inv.buyer as any).name || (inv.buyer as any).legalName || 'N/A'}</td>
                              <td className="px-6 py-4 text-text-muted">{inv.type}</td>
                              <td className="px-6 py-4 text-right font-bold">{inv.totalAmount.toLocaleString()} {t('currency')}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      inv.status === 'POSTED' ? 'bg-success/10 text-success' : 
                                      inv.status === 'APPROVED' ? 'bg-blue/10 text-blue-500' : 'bg-warning/10 text-warning'
                                  }`}>
                                      {inv.status}
                                  </span>
                              </td>
                          </tr>
                      ))}
                      {invoices.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-text-muted">{t('noData')}</td></tr>}
                  </tbody>
              </table>
          )}

          {activeTab === 'expenses' && (
              <table className="w-full text-left text-sm">
                  <thead className="bg-secondary text-text-muted font-semibold border-b border-border">
                      <tr>
                          <th className="px-6 py-4">{t('col.date')}</th>
                          <th className="px-6 py-4">{t('lbl.category')}</th>
                          <th className="px-6 py-4">{t('lbl.description')}</th>
                          <th className="px-6 py-4">{t('col.dept')}</th>
                          <th className="px-6 py-4 text-right">{t('col.amount')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-secondary/30">
                              <td className="px-6 py-4 text-text-muted">{exp.date}</td>
                              <td className="px-6 py-4">
                                  <span className="bg-secondary text-text-muted px-2 py-1 rounded text-xs border border-border">
                                      {exp.category}
                                  </span>
                              </td>
                              <td className="px-6 py-4 font-medium">{exp.description}</td>
                              <td className="px-6 py-4 text-text-muted">{exp.department}</td>
                              <td className="px-6 py-4 text-right font-bold text-danger">-{exp.amount.toLocaleString()} {t('currency')}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </Card>
    </div>
  );
};

export default Accounting;
