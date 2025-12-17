import { supabase } from '../services/supabaseClient';
import { ContractStatus } from '../types';

const TABLES = {
  contracts: 'contracts',
  contractItems: 'contract_items',
  contractMilestones: 'contract_milestones',
};

export const contractRepository = {
  async fetchPaginated(tenantId: string, pageSize: number, lastId?: string) {
    let query = supabase
      .from(TABLES.contracts)
      .select(
        `
          id, contract_number, client_id, title, total_value, status, start_date, delivery_date, notes, created_at, created_by,
          party_a, party_b, currency,
          items:${TABLES.contractItems}(id, product_name, quantity, unit_price),
          milestones:${TABLES.contractMilestones}(id, title, amount, percentage, due_date, status, paid_at),
          customers:client_id(id, company_name, name, email, phone, vat_number, address)
        `,
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (lastId) query = query.lt('id', lastId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async fetchById(id: string, tenantId: string) {
    const { data, error } = await supabase
      .from(TABLES.contracts)
      .select(
        `
          id, contract_number, client_id, title, total_value, status, start_date, delivery_date, notes, created_at, created_by,
          party_a, party_b, currency,
          items:${TABLES.contractItems}(id, product_name, quantity, unit_price),
          milestones:${TABLES.contractMilestones}(id, title, amount, percentage, due_date, status, paid_at),
          customers:client_id(id, company_name, name, email, phone, vat_number, address)
        `,
      )
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      // Gracefully allow not-found to mirror previous dataService behavior
      if ((error as any).code === 'PGRST116' || /No rows/.test((error as any).message || '')) {
        return null;
      }
      throw error;
    }
    return data || null;
  },

  async create(
    contractPayload: Record<string, any>,
    itemsPayload: Array<Record<string, any>>, 
    milestonesPayload: Array<Record<string, any>>, 
    tenantId: string,
  ) {
    const { data, error } = await supabase.rpc('create_contract', {
      p_contract: contractPayload,
      p_items: itemsPayload,
      p_milestones: milestonesPayload,
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data as { id?: string } | null;
  },

  async updateStatus(id: string, tenantId: string, status: ContractStatus) {
    const { error } = await supabase
      .from(TABLES.contracts)
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },

  async markSignedByClient(id: string, tenantId: string) {
    return this.updateStatus(id, tenantId, ContractStatus.SIGNED_CLIENT);
  },

  async payMilestone(args: {
    milestoneId: string;
    contractId: string;
    amount: number;
    method: string;
    userId: string;
    receiptNumber: string;
    contractTitle: string;
    clientName: string;
    notes?: string;
    tenantId: string;
  }) {
    const { error } = await supabase.rpc('pay_milestone', {
      p_milestone_id: args.milestoneId,
      p_contract_id: args.contractId,
      p_amount: args.amount,
      p_method: args.method,
      p_user_id: args.userId,
      p_receipt_number: args.receiptNumber,
      p_contract_title: args.contractTitle,
      p_client_name: args.clientName,
      p_notes: args.notes || 'Payment for milestone',
      p_tenant_id: args.tenantId,
    });
    if (error) throw error;
  },
};
