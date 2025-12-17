import { supabase } from '../services/supabaseClient';

const TABLE = 'approvals';
const APPROVAL_COLUMNS = 'id, requester_id, requester_name, target_type, target_id, status, decision_by, decision_at, decision_note, payload, created_at, updated_at';

export type ApprovalRow = {
  id: string;
  requester_id: string | null;
  requester_name: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string | null;
  decision_by: string | null;
  decision_at: string | null;
  decision_note: string | null;
  payload: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
};

export const approvalsRepository = {
  async list(): Promise<ApprovalRow[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(APPROVAL_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ApprovalRow | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(APPROVAL_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async insert(payload: Record<string, any>) {
    const { data, error } = await supabase.from(TABLE).insert(payload).select(APPROVAL_COLUMNS).single();
    if (error) throw error;
    return data as ApprovalRow;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select(APPROVAL_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data as ApprovalRow | null;
  }
};
