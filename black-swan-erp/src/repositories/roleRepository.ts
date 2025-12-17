import { supabase } from '../services/supabaseClient';
import { Role } from '../types';

export interface RoleRecord {
  id: string;
  name: Role;
  description?: string | null;
}

export const roleRepository = {
  async getAll(): Promise<RoleRecord[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name as Role,
      description: r.description,
    }));
  }
};
