import 'server-only';

import type { QuotationResponseStatus } from '@/modules/quotations/schema/quotation.schema';
import {
  collectAccountingRecipients,
  collectAdminDirectorRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
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

const RESPONSE_SALES: Record<
  Exclude<QuotationResponseStatus, 'accepted'>,
  { type: string; title: string; salesBody: (code: string) => string }
> = {
  rejected: {
    type: NOTIFICATION_TYPES.QUOTATION_REJECTED,
    title: 'Khách từ chối báo giá',
    salesBody: (code) =>
      `Báo giá ${code} đã bị khách từ chối. Cần xem lại phương án hoặc cơ hội.`,
  },
  needs_revision: {
    type: NOTIFICATION_TYPES.QUOTATION_NEEDS_REVISION,
    title: 'Báo giá cần chỉnh sửa',
    salesBody: (code) =>
      `Báo giá ${code} cần chỉnh sửa theo phản hồi của khách.`,
  },
  no_response: {
    type: NOTIFICATION_TYPES.QUOTATION_NO_RESPONSE,
    title: 'Khách chưa phản hồi báo giá',
    salesBody: (code) =>
      `Báo giá ${code} chưa có phản hồi từ khách. Cần theo dõi và nhắc lại.`,
  },
  expired: {
    type: NOTIFICATION_TYPES.QUOTATION_EXPIRED,
    title: 'Báo giá hết hiệu lực',
    salesBody: (code) =>
      `Báo giá ${code} đã hết hiệu lực. Cần đánh giá và xử lý tiếp.`,
  },
};

function quotationHref(quotationId: string) {
  return `/quotations/${quotationId}`;
}

export async function notifyQuotationCreated(params: QuotationWithLeadParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Báo giá mới được tạo',
          body: `Báo giá ${params.quotationCode} đã được tạo. Cần kiểm tra và gửi cho khách nếu phù hợp.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Báo giá mới cần theo dõi',
          body: `Dự án ${customerName} đã có báo giá mới ${params.quotationCode}.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_CREATED,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: quotationHref(params.quotationId),
    },
    params.actorUserId,
  );
}

export async function notifyQuotationSent(params: QuotationWithLeadParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Báo giá đã gửi cho khách',
          body: `Báo giá ${params.quotationCode} đã được đánh dấu gửi cho khách.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Báo giá đã được gửi',
          body: `Dự án ${customerName} đã gửi báo giá ${params.quotationCode} cho khách.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_SENT,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: quotationHref(params.quotationId),
    },
    params.actorUserId,
  );
}

export async function notifyQuotationEditedAfterSent(
  params: QuotationWithLeadParams,
): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId, params.quotationCreatedBy],
        titleBody: {
          title: 'Báo giá cần gửi lại',
          body: `Báo giá ${params.quotationCode} đã được chỉnh sửa sau khi gửi. Cần xuất và gửi lại cho khách.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Báo giá đã chỉnh sửa sau khi gửi',
          body: `Báo giá ${params.quotationCode} của dự án ${customerName} đã thay đổi sau khi gửi khách.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_EDITED_AFTER_SENT,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: quotationHref(params.quotationId),
    },
    params.actorUserId,
  );
}

export async function notifyQuotationAccepted(params: QuotationWithLeadParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, accountingIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    collectAccountingRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Khách đã đồng ý báo giá',
          body: `Báo giá ${params.quotationCode} đã được khách đồng ý. Cần chuyển sang bước hợp đồng.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Báo giá đã được khách đồng ý',
          body: `Dự án ${customerName} đã chốt báo giá ${params.quotationCode}.`,
        },
      },
      {
        recipientUserIds: accountingIds,
        titleBody: {
          title: 'Cần theo dõi hợp đồng/thanh toán',
          body: `Báo giá ${params.quotationCode} đã được khách đồng ý. Cần theo dõi hợp đồng và thanh toán liên quan.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: quotationHref(params.quotationId),
    },
    params.actorUserId,
  );
}

export async function notifyQuotationResponse(
  params: QuotationWithLeadParams & { responseStatus: QuotationResponseStatus },
): Promise<void> {
  if (params.responseStatus === 'accepted') {
    await notifyQuotationAccepted(params);
    return;
  }

  const meta = RESPONSE_SALES[params.responseStatus];
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({ leadId: params.leadId }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: meta.title,
          body: meta.salesBody(params.quotationCode),
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: meta.title,
          body: `Dự án ${customerName} — báo giá ${params.quotationCode}: ${meta.title.toLowerCase()}.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: meta.type,
      module: 'quotations',
      entityType: 'quotation',
      entityId: params.quotationId,
      href: quotationHref(params.quotationId),
    },
    params.actorUserId,
  );
}
