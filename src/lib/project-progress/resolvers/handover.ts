import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';
import type { HandoverStatus } from '@/modules/handovers/schema/handover.schema';

export function resolveHandoverStage(ctx: ProjectContext): ProjectStageResolution | null {
  const handover = ctx.records.handover;
  if (!handover) return null;

  const status = handover.status as HandoverStatus;

  if (status === 'cancelled') {
    const stage = getStageDefinition('handover_cancelled');
    return {
      stage,
      dashboardStatus: 'handover_cancelled',
      currentStageLabel: 'Phiếu bàn giao đã hủy',
      nextAction: '—',
      primaryModule: 'handover',
    };
  }

  if (status === 'completed') {
    const stage = getStageDefinition('handover_completed');
    return {
      stage,
      dashboardStatus: 'handover_completed',
      currentStageLabel: 'Đã bàn giao',
      nextAction: 'Bảo hành / chăm sóc sau bán',
      primaryModule: 'handover',
    };
  }

  const stage = getStageDefinition('handover_pending');
  return {
    stage,
    dashboardStatus: 'handover_pending',
    currentStageLabel: 'Chờ bàn giao',
    nextAction: 'Hoàn tất bàn giao',
    primaryModule: 'handover',
  };
}
