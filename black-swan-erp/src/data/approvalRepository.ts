import { supabase } from '../lib/supabase';
import { ApprovalTarget } from '../shared/types';

export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface ApprovalRequestInput {
  targetType: ApprovalTarget;
  targetId: string;
  title?: string;
  description?: string;
  amount?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  payload?: Record<string, unknown>;
}

export const approvalRepository = {
  async createRequest(request: ApprovalRequestInput): Promise<void> {
    const { error } = await supabase.rpc('create_approval_request', {
      p_target_type: request.targetType,
      p_target_id: request.targetId,
      p_title: request.title || 'Approval Required',
      p_description: request.description || null,
      p_amount: request.amount || null,
      p_priority: request.priority || 'MEDIUM',
      p_payload: request.payload || null,
    });

    if (error) throw error;
  },

  async decide(targetType: ApprovalTarget, targetId: string, decision: ApprovalDecision, note?: string): Promise<void> {
    const { error } = await supabase.rpc('approval_decision', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_action: decision,
      p_note: note || null,
    });

    if (error) throw error;
  },
};
