import { useCallback } from 'react';

import { ApprovalTarget } from '../../shared/types';
import { approvalService } from '../approvals/approvalService';

export const useApprovals = () => {
  const approveEntity = useCallback(
    async (targetType: ApprovalTarget, targetId: string, note?: string) =>
      approvalService.approveEntity(targetType, targetId, note),
    [],
  );

  const rejectEntity = useCallback(
    async (targetType: ApprovalTarget, targetId: string, note?: string) =>
      approvalService.rejectEntity(targetType, targetId, note),
    [],
  );

  const requestApproval = useCallback(
    async (input: {
      targetType: ApprovalTarget;
      targetId: string;
      title?: string;
      description?: string;
      amount?: number;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      payload?: Record<string, unknown>;
    }) => approvalService.requestApproval(input),
    [],
  );

  return { approveEntity, rejectEntity, requestApproval };
};
