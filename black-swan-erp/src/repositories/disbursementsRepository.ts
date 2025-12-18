import { supabase } from '../services/supabaseClient';

const TABLE = 'disbursements';
const COLUMNS = 'id, description, amount, date, category, payment_method, status, approved_by, attachment_url, supplier_id, contract_id, project_id, tenant_id, created_at, supplier:suppliers(name), contract:contracts(title), project:projects(name)';

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
  supplier_id?: string | null;
  contract_id?: string | null;
  project_id?: string | null;
  supplier?: { name: string | null } | null;
  contract?: { title: string | null } | null;
  project?: { name: string | null } | null;
  tenant_id: string | null;
  created_at: string;
};

const normalize = (row: any): DisbursementRow => {
  // Supabase can return related rows as arrays; take the first item for 1:1 relations
  const supplier = Array.isArray(row?.supplier) ? row.supplier[0] : row?.supplier;
  const contract = Array.isArray(row?.contract) ? row.contract[0] : row?.contract;
  const project = Array.isArray(row?.project) ? row.project[0] : row?.project;
  return { ...row, supplier, contract, project } as DisbursementRow;
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
    return (data || []).map(normalize);
  },

  async getById(id: string): Promise<DisbursementRow | null> {
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? normalize(data) : null;
  },

  async insert(payload: Partial<DisbursementRow>): Promise<DisbursementRow> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select(COLUMNS).single();
    if (error) throw error;
    return normalize(data);
  },

  async update(id: string, updates: Partial<DisbursementRow>): Promise<DisbursementRow | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    return data ? normalize(data) : null;
  }
};


