
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { accountingService } from '../../services/supabase/accounting.service';
import { JournalEntry, JournalLine, Account, AccountType } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

const JournalEntryForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Partial<JournalLine>[]>([
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' }
  ]);

  useEffect(() => {
    accountingService.getAccounts().then(setAccounts);
  }, []);

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAddLine = () => {
      setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const handleRemoveLine = (index: number) => {
      setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
      const newLines = [...lines];
      newLines[index] = { ...newLines[index], [field]: value };
      
      // Auto-clear opposite field if one is set
      if (field === 'debit' && value > 0) newLines[index].credit = 0;
      if (field === 'credit' && value > 0) newLines[index].debit = 0;
      
      setLines(newLines);
  };

  const handleSubmit = async () => {
      if (!description || !reference) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }
      if (!isBalanced) {
          showToast('Entry is not balanced', 'error');
          return;
      }
      if (lines.some(l => !l.accountId || (l.debit === 0 && l.credit === 0))) {
          showToast('Invalid lines detected', 'error');
          return;
      }

      try {
        await dataService.createJournalEntry({
            date: date,
            reference: reference,
            description: description,
            status: 'POSTED', // Auto-post for MVP, or DRAFT
            lines: lines.map(l => ({
                accountId: l.accountId!,
                description: l.description || description,
                debit: l.debit || 0,
                credit: l.credit || 0
            })) as JournalLine[]
        });

        showToast(t('msg.saved'), 'success');
        navigate('/accounting');
      } catch (error) {
        console.error(error);
        showToast('Failed to create journal entry', 'error');
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader 
        title={t('accounting.newEntry')} 
        actions={
            <Button variant="ghost" onClick={() => navigate('/accounting')}>
                <ArrowLeft size={16} className="mr-2"/> {t('back')}
            </Button>
        }
      />

      <Card>
          <CardContent className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label={t('col.date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
                  <Input label={t('col.docNo')} value={reference} onChange={e => setReference(e.target.value)} placeholder="JV-2023-001" />
                  <Input label={t('col.description')} value={description} onChange={e => setDescription(e.target.value)} placeholder="Adjustment entry..." />
              </div>

              {/* Lines */}
              <div className="border rounded-lg overflow-hidden">
                  <div className="bg-secondary/30 p-3 grid grid-cols-12 gap-2 font-bold text-xs text-text-muted">
                      <div className="col-span-4 uppercase">{t('col.account')}</div>
                      <div className="col-span-3 uppercase">{t('col.optionalDesc')}</div>
                      <div className="col-span-2 text-right uppercase">{t('col.debit')}</div>
                      <div className="col-span-2 text-right uppercase">{t('col.credit')}</div>
                      <div className="col-span-1"></div>
                  </div>
                  <div className="divide-y divide-border">
                      {lines.map((line, idx) => (
                          <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center bg-surface">
                              <div className="col-span-4">
                                  <select 
                                    className="w-full bg-transparent border border-border rounded text-sm py-1"
                                    value={line.accountId}
                                    onChange={e => updateLine(idx, 'accountId', e.target.value)}
                                  >
                                      <option value="">Select Account</option>
                                      {accounts.map(acc => (
                                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="col-span-3">
                                  <input 
                                    className="w-full bg-transparent border border-border rounded text-sm py-1 px-2"
                                    value={line.description}
                                    onChange={e => updateLine(idx, 'description', e.target.value)}
                                    placeholder={description}
                                  />
                              </div>
                              <div className="col-span-2">
                                  <input 
                                    type="number"
                                    className="w-full bg-transparent border border-border rounded text-sm py-1 px-2 text-right"
                                    value={line.debit || ''}
                                    onChange={e => updateLine(idx, 'debit', Number(e.target.value))}
                                  />
                              </div>
                              <div className="col-span-2">
                                  <input 
                                    type="number"
                                    className="w-full bg-transparent border border-border rounded text-sm py-1 px-2 text-right"
                                    value={line.credit || ''}
                                    onChange={e => updateLine(idx, 'credit', Number(e.target.value))}
                                  />
                              </div>
                              <div className="col-span-1 text-center">
                                  <button onClick={() => handleRemoveLine(idx)} className="text-text-muted hover:text-red-500">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 bg-secondary/10 border-t border-border flex justify-between items-center">
                      <Button size="sm" variant="outline" onClick={handleAddLine}><Plus size={14} className="mr-1"/> {t('btn.addLine')}</Button>
                      <div className="flex gap-8 text-sm">
                          <div className={`font-bold ${Math.abs(totalDebit - totalCredit) > 0.01 ? 'text-red-500' : 'text-success'}`}>
                              {t('accounting.difference')}: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                          </div>
                          <div>{t('accounting.totalDebit')}: <span className="font-mono font-bold">{totalDebit.toFixed(2)}</span></div>
                          <div>{t('accounting.totalCredit')}: <span className="font-mono font-bold">{totalCredit.toFixed(2)}</span></div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end pt-4">
                  <Button onClick={handleSubmit} disabled={!isBalanced} size="lg">
                      <Save size={18} className="mr-2"/> {t('btn.postEntry')}
                  </Button>
              </div>
          </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryForm;
