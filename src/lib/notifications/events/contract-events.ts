import 'server-only';

import { createNotificationsForUsers } from '../create-notification';
import {
  collectAccountingRecipients,
  collectAdminDirectorRecipients,
  collectRecipients,
} from '../recipients';
import { NOTIFICATION_TYPES } from '../types';

type ContractCreatedParams = {
  contractId: string;
  contractCode: string;
  actorUserId?: string | null;
};

export async function notifyContractCreated(params: ContractCreatedParams): Promise<void> {
  const [adminDirectorIds, accountingIds] = await Promise.all([
    collectAdminDirectorRecipients(params.actorUserId),
    collectAccountingRecipients(params.actorUserId),
  ]);

  const recipients = await collectRecipients(
    [...adminDirectorIds, ...accountingIds],
    params.actorUserId,
  );
  if (recipients.length === 0) return;

  await createNotificationsForUsers(
    recipients,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.CONTRACT_CREATED,
      title: 'Hợp đồng mới được tạo',
      body: `Hợp đồng ${params.contractCode} đã được tạo từ báo giá đã chấp nhận.`,
      module: 'contracts',
      entityType: 'contract',
      entityId: params.contractId,
      href: `/contracts/${params.contractId}`,
    },
    { actorUserId: params.actorUserId },
  );
}
