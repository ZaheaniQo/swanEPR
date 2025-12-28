import { supabase } from '../lib/supabase';
import { JournalEntry, JournalLine } from '../types';

type JournalLineRow = {
  id: string;
  account_id: string;
  cost_center_id?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
};

type JournalEntryRow = {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  reference?: string | null;
  status: string;
  created_by: string;
  created_at: string;
  posted_at?: string | null;
  posted_by?: string | null;
  lines?: JournalLineRow[];
};

const mapLine = (row: JournalLineRow): JournalLine => ({
  accountId: row.account_id,
  costCenterId: row.cost_center_id ?? undefined,
  description: row.description ?? undefined,
  debit: Number(row.debit || 0),
  credit: Number(row.credit || 0),
});

const mapEntry = (row: JournalEntryRow): JournalEntry => {
  const lines = (row.lines || []).map(mapLine);
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  return {
    id: row.id,
    entryNumber: row.entry_number,
    date: row.date,
    description: row.description,
    reference: row.reference ?? undefined,
    status: row.status as JournalEntry['status'],
    lines,
    fiscalPeriodId: undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    postedAt: row.posted_at ?? undefined,
    postedBy: row.posted_by ?? undefined,
    totalDebit,
    totalCredit,
  };
};

export const journalRepository = {
  async list(): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(
          'id, entry_number, date, description, reference, status, created_by, created_at, posted_at, posted_by, lines:journal_lines(id, account_id, cost_center_id, description, debit, credit)'
      )
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => mapEntry(row as JournalEntryRow));
  },

  async getById(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(
        'id, entry_number, date, description, reference, status, created_by, created_at, posted_at, posted_by, lines:journal_lines(id, account_id, cost_center_id, description, debit, credit)'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapEntry(data as JournalEntryRow);
  },

  async create(payload: {
    entryNumber?: string;
    date: string;
    description?: string;
    reference?: string;
    lines: JournalLine[];
  }): Promise<string> {
    const { data, error } = await supabase.rpc('create_journal_entry_secure', {
      p_entry: {
        entry_number: payload.entryNumber,
        date: payload.date,
        description: payload.description,
        reference: payload.reference,
      },
      p_lines: payload.lines.map((line) => ({
        account_id: line.accountId,
        cost_center_id: line.costCenterId,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      })),
    });

    if (error) throw error;
    return (data as { id: string }).id;
  },
};
