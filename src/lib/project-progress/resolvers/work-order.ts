import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';
import type { WorkOrderStatus } from '@/modules/work-orders/schema/work-order.schema';

export function resolveWorkOrderStage(ctx: ProjectContext): ProjectStageResolution | null {
  const handover = ctx.records.handover;
  if (handover && handover.status !== 'cancelled') return null;

  const workOrder = ctx.records.work_order;
  if (!workOrder) return null;

  const status = workOrder.status as WorkOrderStatus;

  if (status === 'cancelled') {
    const stage = getStageDefinition('work_order_cancelled');
    return {
      stage,
      dashboardStatus: 'work_order_cancelled',
      currentStageLabel: 'Lệnh thi công đã hủy',
      nextAction: '—',
      primaryModule: 'work_order',
    };
  }

  if (status === 'completed') {
    const stage = getStageDefinition('work_order_completed');
    return {
      stage,
      dashboardStatus: 'work_order_completed',
      currentStageLabel: 'Thi công hoàn thành',
      nextAction: 'Bàn giao',
      primaryModule: 'work_order',
    };
  }

  if (status === 'in_progress') {
    const stage = getStageDefinition('work_order_in_progress');
    return {
      stage,
      dashboardStatus: 'work_order_in_progress',
      currentStageLabel: 'Đang thi công',
      nextAction: 'Hoàn thành thi công',
      primaryModule: 'work_order',
    };
  }

  // draft and scheduled — same project label; scheduled uses faster next step
  const stage = getStageDefinition('work_order_created');
  const isScheduled = status === 'scheduled';
  return {
    stage,
    dashboardStatus: 'work_order_created',
    currentStageLabel: 'Đã tạo lệnh thi công',
    nextAction: isScheduled ? 'Bắt đầu thi công' : 'Lên lịch thi công',
    primaryModule: 'work_order',
  };
}
