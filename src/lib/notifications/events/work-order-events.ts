import 'server-only';

import { createNotification } from '../create-notification';
import {
  collectAdminDirectorRecipients,
  collectRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';

type WorkOrderBaseParams = {
  workOrderId: string;
  workOrderCode: string;
  leadId?: string | null;
  customerId?: string | null;
  actorUserId?: string | null;
};

function workOrderHref(workOrderId: string) {
  return `/work-orders/${workOrderId}`;
}

const ASSIGNED_TITLE_BODY = {
  title: 'Bạn được phân công thi công',
  body: (code: string) => `Lệnh thi công ${code} đã được phân công cho bạn.`,
} as const;

export async function notifyWorkOrderAssigned(
  params: WorkOrderBaseParams & { assignedTo: string },
): Promise<void> {
  const recipients = await collectRecipients([params.assignedTo], params.actorUserId);
  if (recipients.length === 0) return;

  await createNotification({
    recipientUserId: recipients[0]!,
    actorUserId: params.actorUserId ?? null,
    type: NOTIFICATION_TYPES.WORK_ORDER_ASSIGNED,
    title: ASSIGNED_TITLE_BODY.title,
    body: ASSIGNED_TITLE_BODY.body(params.workOrderCode),
    module: 'work-orders',
    entityType: 'work_order',
    entityId: params.workOrderId,
    href: workOrderHref(params.workOrderId),
  });
}

export async function notifyWorkOrderCreated(
  params: WorkOrderBaseParams & { assignedTo?: string | null },
): Promise<void> {
  const [leadOwnerId, adminDirectorIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    queryCustomerDisplayName({
      leadId: params.leadId,
      customerId: params.customerId,
    }),
  ]);

  const common = {
    actorUserId: params.actorUserId ?? null,
    type: NOTIFICATION_TYPES.WORK_ORDER_CREATED,
    module: 'work-orders',
    entityType: 'work_order',
    entityId: params.workOrderId,
    href: workOrderHref(params.workOrderId),
  } as const;

  const batches = [];

  if (params.assignedTo) {
    batches.push({
      recipientUserIds: [params.assignedTo],
      titleBody: {
        title: ASSIGNED_TITLE_BODY.title,
        body: ASSIGNED_TITLE_BODY.body(params.workOrderCode),
      },
    });
  }

  batches.push(
    {
      recipientUserIds: [leadOwnerId],
      titleBody: {
        title: 'Lệnh thi công đã được tạo',
        body: `Dự án ${customerName} đã có lệnh thi công ${params.workOrderCode}.`,
      },
    },
    {
      recipientUserIds: adminDirectorIds,
      titleBody: {
        title: 'Lệnh thi công mới',
        body: `Lệnh thi công ${params.workOrderCode} đã được tạo cho dự án ${customerName}.`,
      },
    },
  );

  await notifyCategoryBatches(batches, common, params.actorUserId);
}

export async function notifyWorkOrderCompleted(params: WorkOrderBaseParams): Promise<void> {
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
          title: 'Thi công đã hoàn thành',
          body: `Lệnh thi công ${params.workOrderCode} đã hoàn thành. Cần chuẩn bị bàn giao.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Dự án đã hoàn thành thi công',
          body: `Dự án ${customerName} đã hoàn thành thi công.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WORK_ORDER_COMPLETED,
      module: 'work-orders',
      entityType: 'work_order',
      entityId: params.workOrderId,
      href: workOrderHref(params.workOrderId),
    },
    params.actorUserId,
  );
}
