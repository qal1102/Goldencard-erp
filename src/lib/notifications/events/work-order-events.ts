import 'server-only';

import { createNotification, createNotificationsForUsers } from '../create-notification';
import {
  collectAdminDirectorRecipients,
  collectRecipients,
} from '../recipients';
import { NOTIFICATION_TYPES } from '../types';

type WorkOrderCreatedParams = {
  workOrderId: string;
  workOrderCode: string;
  assignedTo?: string | null;
  actorUserId?: string | null;
};

export async function notifyWorkOrderCreated(params: WorkOrderCreatedParams): Promise<void> {
  const href = `/work-orders/${params.workOrderId}`;
  const title = 'Lệnh thi công mới được tạo';
  const body = `Lệnh thi công ${params.workOrderCode} đã được tạo từ hợp đồng đã ký.`;

  if (params.assignedTo && params.assignedTo !== params.actorUserId) {
    await createNotification({
      recipientUserId: params.assignedTo,
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WORK_ORDER_CREATED,
      title,
      body,
      module: 'work-orders',
      entityType: 'work_order',
      entityId: params.workOrderId,
      href,
    });
  }

  const adminDirectorIds = await collectAdminDirectorRecipients(params.actorUserId);
  const recipients = await collectRecipients(adminDirectorIds, params.actorUserId);
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WORK_ORDER_CREATED,
      title,
      body,
      module: 'work-orders',
      entityType: 'work_order',
      entityId: params.workOrderId,
      href,
    },
    { actorUserId: params.actorUserId },
  );
}
