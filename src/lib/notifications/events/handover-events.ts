import 'server-only';

import {
  collectAdminDirectorRecipients,
  collectCustomerServiceRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';

type HandoverBaseParams = {
  handoverId: string;
  handoverCode: string;
  leadId?: string | null;
  customerId?: string | null;
  actorUserId?: string | null;
};

function handoverHref(handoverId: string) {
  return `/handovers/${handoverId}`;
}

export async function notifyHandoverCreated(params: HandoverBaseParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({
      leadId: params.leadId,
      customerId: params.customerId,
    }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Phiếu bàn giao đã được tạo',
          body: `Phiếu bàn giao ${params.handoverCode} đã được tạo. Cần theo dõi xác nhận của khách.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Phiếu bàn giao mới',
          body: `Dự án ${customerName} đã chuyển sang bước bàn giao.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.HANDOVER_CREATED,
      module: 'handovers',
      entityType: 'handover',
      entityId: params.handoverId,
      href: handoverHref(params.handoverId),
    },
    params.actorUserId,
  );
}

export async function notifyHandoverCompleted(params: HandoverBaseParams): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerServiceIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    collectCustomerServiceRecipients(params.actorUserId),
    queryCustomerDisplayName({
      leadId: params.leadId,
      customerId: params.customerId,
    }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [leadOwnerId],
        titleBody: {
          title: 'Đã bàn giao cho khách',
          body: `Phiếu bàn giao ${params.handoverCode} đã hoàn tất.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Dự án đã bàn giao',
          body: `Dự án ${customerName} đã hoàn tất bàn giao.`,
        },
      },
      {
        recipientUserIds: customerServiceIds,
        titleBody: {
          title: 'Dự án đã bàn giao',
          body: `Dự án ${customerName} đã bàn giao. Có thể theo dõi chăm sóc sau bán.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.HANDOVER_COMPLETED,
      module: 'handovers',
      entityType: 'handover',
      entityId: params.handoverId,
      href: handoverHref(params.handoverId),
    },
    params.actorUserId,
  );
}
