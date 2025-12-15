
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { LedgerEntry, Invoice, Expense, Role } from '../types';
import { DollarSign, FileText, PieChart, Plus, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';

const Accounting: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices' | 'expenses'>('ledger');
  
  // Data State
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<LedgerEntry>>({ type: 'DEBIT', amount: 0, description: '', department: 'Admin' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const l = await dataService.getLedgerEntries();
    setLedger(l);
    const i = await dataService.getInvoices();
    setInvoices(i);
    const e = await dataService.getExpenses();
    setExpenses(e);
  };

  const handleAddEntry = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    
    await dataService.addLedgerEntry({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        documentNumber: `MAN-${Date.now().toString().substr(-4)}`,
        description: newEntry.description!,
        amount: Number(newEntry.amount),
        type: newEntry.type as 'DEBIT' | 'CREDIT',
        department: newEntry.department
    });
    
    showToast('Entry added successfully', 'success');
    setIsEntryModalOpen(false);
    loadData();
  };

  // Calculate Running Balance
  let runningBalance = 0;
  const ledgerWithBalance = ledger.map(entry => {
    if (entry.type === 'DEBIT') runningBalance += entry.amount;
    else runningBalance -= entry.amount;
    return { ...entry, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('accounting.title')}</h1>
            <p className="text-slate-500">{t('accounting.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ledger' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <FileText size={16} /> General Ledger
        </button>
        <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'invoices' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <DollarSign size={16} /> Invoices
        </button>
        <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'expenses' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <PieChart size={16} /> Expenses
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          
          {/* LEDGER VIEW */}
          {activeTab === 'ledger' && (
              <div>
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Filter size={14} /> Filter: All Departments
                      </div>
                      <button 
                        onClick={() => setIsEntryModalOpen(true)}
                        className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2"
                      >
                          <Plus size={14} /> New Entry
                      </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Doc #</th>
                                <th className="px-4 py-3 w-1/3">Description</th>
                                <th className="px-4 py-3">Dept</th>
                                <th className="px-4 py-3 text-right text-emerald-600">Debit (In)</th>
                                <th className="px-4 py-3 text-right text-red-600">Credit (Out)</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ledgerWithBalance.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No ledger entries found.</td></tr>
                            ) : (
                                ledgerWithBalance.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.date}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{entry.documentNumber}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {entry.description}
                                            {entry.contractId && <span className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">#{entry.contractId}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{entry.department || '-'}</td>
                                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                            {entry.type === 'DEBIT' ? `+${entry.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-red-500">
                                            {entry.type === 'CREDIT' ? `-${entry.amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 bg-slate-50/50">
                                            ${entry.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}

          {/* INVOICES VIEW */}
          {activeTab === 'invoices' && (
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Invoice #</th>
                          <th className="px-6 py-4">Contract</th>
                          <th className="px-6 py-4">Due Date</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-mono text-slate-600">{inv.invoiceNumber}</td>
                              <td className="px-6 py-4 font-medium">{inv.contractTitle}</td>
                              <td className="px-6 py-4 text-slate-500">{inv.dueDate}</td>
                              <td className="px-6 py-4 text-slate-500">{inv.type}</td>
                              <td className="px-6 py-4 text-right font-bold">${inv.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                                      inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                      {inv.status}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}

          {/* EXPENSES VIEW */}
          {activeTab === 'expenses' && (
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 text-slate-500">{exp.date}</td>
                              <td className="px-6 py-4">
                                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                                      {exp.category}
                                  </span>
                              </td>
                              <td className="px-6 py-4 font-medium">{exp.description}</td>
                              <td className="px-6 py-4 text-slate-500">{exp.department}</td>
                              <td className="px-6 py-4 text-right font-bold text-red-600">-${exp.amount.toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* New Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">New Ledger Entry</div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setNewEntry({...newEntry, type: 'DEBIT'})}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newEntry.type === 'DEBIT' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                            >
                                <ArrowDownLeft size={16} className="inline mr-1"/> Deposit (Debit)
                            </button>
                            <button 
                                onClick={() => setNewEntry({...newEntry, type: 'CREDIT'})}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newEntry.type === 'CREDIT' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-500'}`}
                            >
                                <ArrowUpRight size={16} className="inline mr-1"/> Withdrawal (Credit)
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                        <input 
                            className="w-full border-slate-300 rounded-lg text-sm" 
                            type="text" 
                            placeholder="e.g. Utility Payment"
                            value={newEntry.description}
                            onChange={e => setNewEntry({...newEntry, description: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                        <input 
                            className="w-full border-slate-300 rounded-lg text-sm" 
                            type="number" 
                            placeholder="0.00"
                            value={newEntry.amount || ''}
                            onChange={e => setNewEntry({...newEntry, amount: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                        <select 
                            className="w-full border-slate-300 rounded-lg text-sm"
                            value={newEntry.department}
                            onChange={e => setNewEntry({...newEntry, department: e.target.value})}
                        >
                            <option value="Admin">Admin</option>
                            <option value="Production">Production</option>
                            <option value="Sales">Sales</option>
                            <option value="HR">HR</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsEntryModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                    <button onClick={handleAddEntry} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">Save Entry</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
