import { supabase } from '../services/supabaseClient';

const TABLE = 'customers';

export const customerRepository = {
  async fetchAll(tenantId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, company_name, email, phone, vat_number, address, notes')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data || [];
  },

  async fetchById(id: string, tenantId: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, company_name, email, phone, vat_number, address, notes')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async create(payload: Record<string, any>) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id as string;
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
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};
