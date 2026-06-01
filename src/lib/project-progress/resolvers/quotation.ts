import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';
import type { QuotationStatus } from '@/modules/quotations/schema/quotation.schema';

const QUOTATION_NEXT: Record<
  QuotationStatus,
  { stageKey: Parameters<typeof getStageDefinition>[0]; nextAction: string }
> = {
  draft: { stageKey: 'quotation_draft', nextAction: 'Hoàn thiện và gửi báo giá' },
  sent: { stageKey: 'quotation_sent', nextAction: 'Theo dõi phản hồi khách hàng' },
  accepted: { stageKey: 'quotation_accepted', nextAction: 'Lập hợp đồng' },
  rejected: { stageKey: 'quotation_rejected', nextAction: 'Tạo bản báo giá mới hoặc cập nhật lead' },
  needs_revision: {
    stageKey: 'quotation_needs_revision',
    nextAction: 'Tạo bản chỉnh sửa báo giá',
  },
  no_response: {
    stageKey: 'quotation_no_response',
    nextAction: 'Liên hệ lại khách hoặc tạo bản mới',
  },
  expired: { stageKey: 'quotation_expired', nextAction: 'Tạo bản báo giá mới' },
};

export function resolveQuotationStage(ctx: ProjectContext): ProjectStageResolution | null {
  if (ctx.records.survey?.status === 'cancelled') return null;

  const quotation = ctx.records.quotation;
  if (!quotation) return null;

  const needsResend = Boolean(quotation.meta?.needsResend);

  if (needsResend) {
    const stage = getStageDefinition('quotation_needs_resend');
    return {
      stage,
      dashboardStatus: 'quotation_needs_resend',
      currentStageLabel: stage.label,
      nextAction: 'Xuất file và gửi lại báo giá cho khách',
      primaryModule: 'quotation',
    };
  }

  const mapped = QUOTATION_NEXT[quotation.status as QuotationStatus];
  if (!mapped) {
    return {
      stage: getStageDefinition('quotation_draft'),
      dashboardStatus: 'quotation_draft',
      currentStageLabel: quotation.statusLabel,
      nextAction: 'Kiểm tra báo giá',
      primaryModule: 'quotation',
    };
  }

  const stage = getStageDefinition(mapped.stageKey);
  return {
    stage,
    dashboardStatus: mapped.stageKey,
    currentStageLabel: stage.label,
    nextAction: mapped.nextAction,
    primaryModule: 'quotation',
  };
}
