import { approvalRepository } from '../../data/approvalRepository';
import { ApprovalTarget } from '../../shared/types';

export const approvalService = {
  requestApproval: async (input: {
    targetType: ApprovalTarget;
    targetId: string;
    title?: string;
    description?: string;
    amount?: number;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    payload?: Record<string, unknown>;
  }) => {
    await approvalRepository.createRequest(input);
  },

  approveEntity: async (targetType: ApprovalTarget, targetId: string, note?: string) => {
    await approvalRepository.decide(targetType, targetId, 'APPROVE', note);
  },

  rejectEntity: async (targetType: ApprovalTarget, targetId: string, note?: string) => {
    await approvalRepository.decide(targetType, targetId, 'REJECT', note);
  },
};
