import 'server-only';

import { createNotification, createNotificationsForUsers } from '../create-notification';
import {
  collectAdminDirectorRecipients,
  collectRecipients,
  queryLeadOwnerUserId,
} from '../recipients';
import { NOTIFICATION_TYPES } from '../types';

type HandoverCreatedParams = {
  handoverId: string;
  handoverCode: string;
  leadId?: string | null;
  actorUserId?: string | null;
};

export async function notifyHandoverCreated(params: HandoverCreatedParams): Promise<void> {
  const href = `/handovers/${params.handoverId}`;
  const title = 'Phiếu bàn giao mới được tạo';
  const body = `Phiếu bàn giao ${params.handoverCode} đã được tạo từ lệnh thi công hoàn thành.`;

  const leadOwnerId = await queryLeadOwnerUserId(params.leadId);
  if (leadOwnerId && leadOwnerId !== params.actorUserId) {
    await createNotification({
      recipientUserId: leadOwnerId,
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.HANDOVER_CREATED,
      title,
      body,
      module: 'handovers',
      entityType: 'handover',
      entityId: params.handoverId,
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
      type: NOTIFICATION_TYPES.HANDOVER_CREATED,
      title,
      body,
      module: 'handovers',
      entityType: 'handover',
      entityId: params.handoverId,
      href,
    },
    { actorUserId: params.actorUserId },
  );
}
