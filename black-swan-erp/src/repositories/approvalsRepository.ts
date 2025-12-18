import { supabase } from '../services/supabaseClient';

const TABLE = 'approvals';
const APPROVAL_COLUMNS = 'id, type, title, description, amount, priority, related_entity_id, requester_id, requester_name, target_type, target_id, status, decision_by, decision_at, decision_note, payload, created_at, updated_at, tenant_id';

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
  tenant_id?: string | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  priority?: string | null;
  related_entity_id?: string | null;
};

export const approvalsRepository = {
  async list(tenantId?: string): Promise<ApprovalRow[]> {
    let query = supabase
      .from(TABLE)
      .select(APPROVAL_COLUMNS)
      .order('created_at', { ascending: false });

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string, tenantId?: string): Promise<ApprovalRow | null> {
    let query = supabase
      .from(TABLE)
      .select(APPROVAL_COLUMNS)
      .eq('id', id);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async insert(payload: Record<string, any>, tenantId?: string) {
    const record = tenantId && !payload.tenant_id ? { ...payload, tenant_id: tenantId } : payload;
    const { data, error } = await supabase.from(TABLE).insert(record).select(APPROVAL_COLUMNS).single();
    if (error) throw error;
    return data as ApprovalRow;
  },

  async update(id: string, updates: Record<string, any>, tenantId?: string) {
    let query = supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query.select(APPROVAL_COLUMNS).maybeSingle();

    if (error) throw error;
    return data as ApprovalRow | null;
  }
};
