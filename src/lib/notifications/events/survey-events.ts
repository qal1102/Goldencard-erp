import 'server-only';

import { createNotificationsForUsers } from '../create-notification';
import {
  collectAdminDirectorRecipients,
  collectRecipients,
  queryLeadOwnerUserId,
} from '../recipients';
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
  const [leadOwnerId, adminDirectorIds] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
  ]);

  const recipients = await collectRecipients(
    [leadOwnerId, ...adminDirectorIds],
    params.actorUserId,
  );
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.SURVEY_COMPLETED,
      title: 'Khảo sát đã hoàn thành',
      body: `Phiếu ${params.surveyCode} đã hoàn thành, cần kiểm tra và tạo báo giá nếu phù hợp.`,
      module: 'surveys',
      entityType: 'survey',
      entityId: params.surveyId,
      href: `/surveys/${params.surveyId}`,
    },
    { actorUserId: params.actorUserId },
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
  const leadOwnerId = await queryLeadOwnerUserId(params.leadId);
  const href = params.quotationId
    ? `/quotations/${params.quotationId}`
    : `/surveys/${params.surveyId}`;

  const recipients = await collectRecipients(
    [params.quotationCreatedBy, leadOwnerId],
    params.actorUserId,
  );
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.SURVEY_CORRECTED_AFTER_QUOTATION,
      title: 'Khảo sát đã được chỉnh sửa sau báo giá',
      body: `Dữ liệu khảo sát ${params.surveyCode} đã thay đổi. Cần kiểm tra lại báo giá liên quan.`,
      module: 'surveys',
      entityType: params.quotationId ? 'quotation' : 'survey',
      entityId: params.quotationId ?? params.surveyId,
      href,
    },
    { actorUserId: params.actorUserId },
  );
}
