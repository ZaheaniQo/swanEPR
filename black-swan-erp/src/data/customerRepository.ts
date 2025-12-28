import { supabase } from '../lib/supabase';
import { Customer } from '../shared/types';

const CUSTOMER_COLUMNS =
  'id, name, company_name, email, phone, vat_number, address, notes';

type CustomerRow = {
  id: string;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  address?: string | null;
  notes?: string | null;
};

const mapCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  company: row.company_name || '',
  email: row.email || '',
  phone: row.phone || '',
  vatNumber: row.vat_number || '',
  address: row.address || '',
  notes: row.notes || undefined,
});

export const customerRepository = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select(CUSTOMER_COLUMNS).order('company_name', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => mapCustomer(row as CustomerRow));
  },
};
