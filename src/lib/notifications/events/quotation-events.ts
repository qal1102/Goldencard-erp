import 'server-only';

import type { QuotationResponseStatus } from '@/modules/quotations/schema/quotation.schema';
import { createNotificationsForUsers } from '../create-notification';
import {
  collectAccountingRecipients,
  collectAdminDirectorRecipients,
  collectRecipients,
  queryLeadOwnerUserId,
} from '../recipients';
import { NOTIFICATION_TYPES } from '../types';

type QuotationBaseParams = {
  quotationId: string;
  quotationCode: string;
  actorUserId?: string | null;
};

type QuotationWithLeadParams = QuotationBaseParams & {
  leadId?: string | null;
  quotationCreatedBy?: string | null;
};

const RESPONSE_NOTIFICATION: Record<
  QuotationResponseStatus,
  { type: string; title: string }
> = {
  accepted: {
    type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
    title: 'Khách đã đồng ý báo giá',
  },
  rejected: {
    type: NOTIFICATION_TYPES.QUOTATION_REJECTED,
    title: 'Khách từ chối báo giá',
  },
  needs_revision: {
    type: NOTIFICATION_TYPES.QUOTATION_NEEDS_REVISION,
    title: 'Báo giá cần chỉnh sửa',
  },
  no_response: {
    type: NOTIFICATION_TYPES.QUOTATION_NO_RESPONSE,
    title: 'Khách chưa phản hồi',
  },
  expired: {
    type: NOTIFICATION_TYPES.QUOTATION_EXPIRED,
    title: 'Báo giá hết hiệu lực',
  },
};

export async function notifyQuotationCreated(params: QuotationWithLeadParams): Promise<void> {
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
      type: NOTIFICATION_TYPES.QUOTATION_CREATED,
      title: 'Báo giá mới được tạo',
      body: `Báo giá ${params.quotationCode} đã được tạo từ phiếu khảo sát.`,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: `/quotations/${params.quotationId}`,
    },
    { actorUserId: params.actorUserId },
  );
}

export async function notifyQuotationSent(params: QuotationWithLeadParams): Promise<void> {
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
      type: NOTIFICATION_TYPES.QUOTATION_SENT,
      title: 'Báo giá đã gửi cho khách',
      body: `Báo giá ${params.quotationCode} đã được đánh dấu gửi cho khách.`,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: `/quotations/${params.quotationId}`,
    },
    { actorUserId: params.actorUserId },
  );
}

export async function notifyQuotationEditedAfterSent(
  params: QuotationWithLeadParams,
): Promise<void> {
  const [leadOwnerId, adminDirectorIds] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
  ]);

  const recipients = await collectRecipients(
    [leadOwnerId, params.quotationCreatedBy, ...adminDirectorIds],
    params.actorUserId,
  );
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_EDITED_AFTER_SENT,
      title: 'Báo giá đã chỉnh sửa sau khi gửi',
      body: `Báo giá ${params.quotationCode} cần được xuất và gửi lại cho khách.`,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: `/quotations/${params.quotationId}`,
    },
    { actorUserId: params.actorUserId },
  );
}

export async function notifyQuotationAccepted(params: QuotationWithLeadParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, accountingIds] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    collectAccountingRecipients(params.actorUserId),
  ]);

  const recipients = await collectRecipients(
    [leadOwnerId, ...adminDirectorIds, ...accountingIds],
    params.actorUserId,
  );
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
      title: 'Khách đã đồng ý báo giá',
      body: `Báo giá ${params.quotationCode} đã được khách đồng ý. Cần chuẩn bị bước hợp đồng/thanh toán.`,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: `/quotations/${params.quotationId}`,
    },
    { actorUserId: params.actorUserId },
  );
}

export async function notifyQuotationResponse(
  params: QuotationWithLeadParams & { responseStatus: QuotationResponseStatus },
): Promise<void> {
  if (params.responseStatus === 'accepted') {
    await notifyQuotationAccepted(params);
    return;
  }

  const meta = RESPONSE_NOTIFICATION[params.responseStatus];
  const leadOwnerId = await queryLeadOwnerUserId(params.leadId);
  const recipients = await collectRecipients([leadOwnerId], params.actorUserId);
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: meta.type,
      title: meta.title,
      body: `Báo giá ${params.quotationCode} — ${meta.title.toLowerCase()}.`,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: `/quotations/${params.quotationId}`,
    },
    { actorUserId: params.actorUserId },
  );
}
