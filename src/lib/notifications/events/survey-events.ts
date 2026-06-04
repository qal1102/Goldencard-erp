import 'server-only';

import { createNotificationsForUsers } from '../create-notification';
import {
  collectAdminDirectorRecipients,
  collectRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';

type SurveyAssignedParams = {
  surveyId: string;
  surveyCode: string;
  assignedTo: string;
  actorUserId?: string | null;
};

export async function notifySurveyAssigned(params: SurveyAssignedParams): Promise<void> {
  const recipients = await collectRecipients([params.assignedTo], params.actorUserId);
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.SURVEY_ASSIGNED,
      title: 'Bạn được phân công khảo sát',
      body: `Phiếu khảo sát ${params.surveyCode} đã được phân công cho bạn.`,
      module: 'surveys',
      entityType: 'survey',
      entityId: params.surveyId,
      href: `/surveys/${params.surveyId}`,
    },
    { actorUserId: params.actorUserId },
  );
}

type SurveyCompletedParams = {
  surveyId: string;
  surveyCode: string;
  leadId?: string | null;
  actorUserId?: string | null;
};

export async function notifySurveyCompleted(params: SurveyCompletedParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  const common = {
    actorUserId: params.actorUserId ?? null,
    type: NOTIFICATION_TYPES.SURVEY_COMPLETED,
    module: 'surveys',
    entityType: 'survey',
    entityId: params.surveyId,
    href: `/surveys/${params.surveyId}`,
  } as const;

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Khảo sát đã hoàn thành',
          body: `Phiếu ${params.surveyCode} đã hoàn thành. Cần kiểm tra và tạo báo giá nếu phù hợp.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Khảo sát đã hoàn thành',
          body: `Dự án ${customerName} đã chuyển sang bước báo giá.`,
        },
      },
    ],
    common,
    params.actorUserId,
  );
}

type SurveyCorrectedParams = {
  surveyId: string;
  surveyCode: string;
  leadId?: string | null;
  quotationId?: string | null;
  quotationCreatedBy?: string | null;
  actorUserId?: string | null;
};

export async function notifySurveyCorrectedAfterQuotation(
  params: SurveyCorrectedParams,
): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  const href = params.quotationId
    ? `/quotations/${params.quotationId}`
    : `/surveys/${params.surveyId}`;

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [params.quotationCreatedBy, leadOwnerId],
        titleBody: {
          title: 'Khảo sát đã thay đổi sau báo giá',
          body: `Dữ liệu khảo sát ${params.surveyCode} đã thay đổi. Cần kiểm tra lại báo giá liên quan.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Khảo sát thay đổi sau báo giá',
          body: `Dự án ${customerName} có khảo sát được chỉnh sửa sau khi đã có báo giá.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.SURVEY_CORRECTED_AFTER_QUOTATION,
      module: 'surveys',
      entityType: params.quotationId ? 'quotation' : 'survey',
      entityId: params.quotationId ?? params.surveyId,
      href,
    },
    params.actorUserId,
  );
}
