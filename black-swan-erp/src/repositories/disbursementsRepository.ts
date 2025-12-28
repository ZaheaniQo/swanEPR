import { supabase } from '../services/supabaseClient';

const TABLE = 'disbursements';
const COLUMNS = 'id, description, amount, date, category, payment_method, status, approved_by, attachment_url, tenant_id, created_at';

export type DisbursementRow = {
  id: string;
  description: string | null;
  amount: number;
  date: string;
  category: string | null;
  payment_method: string | null;
  status: string | null;
  approved_by: string | null;
  attachment_url: string | null;
  tenant_id: string | null;
  created_at: string;
};

export const disbursementsRepository = {
  async list(options: { tenantId?: string; pageSize?: number; lastId?: string } = {}): Promise<DisbursementRow[]> {
    const { tenantId, pageSize = 50, lastId } = options;
    let query = supabase
      .from(TABLE)
      .select(COLUMNS)
      .order('date', { ascending: false })
      .limit(pageSize);

    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (lastId) query = query.lt('id', lastId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DisbursementRow | null> {
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async insert(payload: Partial<DisbursementRow>): Promise<DisbursementRow> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select(COLUMNS).single();
    if (error) throw error;
    return data as DisbursementRow;
  },

  async update(id: string, updates: Partial<DisbursementRow>): Promise<DisbursementRow | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data as DisbursementRow | null;
  }
};
