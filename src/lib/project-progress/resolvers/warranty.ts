import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';
import {
  WARRANTY_ACTIVE_STATUSES,
  type WarrantyTicketStatus,
} from '@/modules/warranty-tickets/schema/warranty-ticket.schema';

export function resolveWarrantyStage(ctx: ProjectContext): ProjectStageResolution | null {
  const warranty = ctx.records.warranty;
  if (!warranty) return null;

  const status = warranty.status as WarrantyTicketStatus;

  if (WARRANTY_ACTIVE_STATUSES.includes(status)) {
    const stage = getStageDefinition('warranty_in_progress');
    return {
      stage,
      dashboardStatus: 'warranty_in_progress',
      currentStageLabel: 'Đang xử lý bảo hành/CSKH',
      nextAction: 'Hoàn tất xử lý yêu cầu',
      primaryModule: 'warranty',
    };
  }

  if (status === 'resolved') {
    const stage = getStageDefinition('warranty_resolved');
    return {
      stage,
      dashboardStatus: 'warranty_resolved',
      currentStageLabel: 'Đã xử lý bảo hành/CSKH',
      nextAction: 'Theo dõi sau xử lý',
      primaryModule: 'warranty',
    };
  }

  return null;
}
