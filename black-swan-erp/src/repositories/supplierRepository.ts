import { supabase } from '../services/supabaseClient';

const TABLE = 'suppliers';

export const supplierRepository = {
  async fetchAll(tenantId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, contact_person, email, phone, vat_number, cr_number, address, type, notes')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data || [];
  },

  async fetchById(id: string, tenantId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, contact_person, email, phone, vat_number, cr_number, address, type, notes')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async create(payload: Record<string, any>) {
    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) throw error;
  },

  async update(id: string, tenantId: string, updates: Record<string, any>) {
    const { error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  async deleteById(id: string, tenantId: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) throw error;
  },
};
