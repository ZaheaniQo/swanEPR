import { supabase } from '../services/supabaseClient';

export const employeeRepository = {
  async fetchAll(tenantId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*, salary_structures(*)')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  },

  async create(p_employee: Record<string, any>, p_salary: Record<string, any>, tenantId: string) {
    const { error } = await supabase.rpc('create_employee', {
      p_employee,
      p_salary,
      p_tenant_id: tenantId
    });
    if (error) throw error;
  },

  async update(id: string, tenantId: string, updates: Record<string, any>) {
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },

  async fetchById(id: string, tenantId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*, salary_structures(*), leaves(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error) throw error;
    return data || null;
  },

  async fetchLatestSalary(employeeId: string) {
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return data || null;
  },

  async fetchSalaryHistory(employeeId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId)
      .order('effective_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertSalaryStructure(employeeId: string, tenantId: string, payload: Record<string, any>) {
    const { error } = await supabase.from('salary_structures').insert({
      employee_id: employeeId,
      tenant_id: tenantId,
      ...payload,
    });
    if (error) throw error;
  },

  async fetchLeaves(employeeId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  },

  async deleteById(id: string, tenantId: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) throw error;
  },
};
