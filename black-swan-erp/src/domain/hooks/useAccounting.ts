import { useCallback, useState } from 'react';

import { LedgerEntry, TaxInvoice, Expense } from '../../types';
import { journalService } from '../journalService';

type AccountingState = {
  ledger: LedgerEntry[];
  invoices: TaxInvoice[];
  expenses: Expense[];
};

// Domain-facing hook to keep the UI presentation-only.
export const useAccounting = () => {
  const [state, setState] = useState<AccountingState>({ ledger: [], invoices: [], expenses: [] });
  const [loading, setLoading] = useState(false);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await journalService.getAccountingSnapshot();
      setState(snapshot);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...state, loading, loadSnapshot };
};
