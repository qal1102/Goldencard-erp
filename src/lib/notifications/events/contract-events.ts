import 'server-only';

import {
  collectAccountingRecipients,
  collectAdminDirectorRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';

type ContractNotifyBase = {
  contractId: string;
  contractCode: string;
  leadId?: string | null;
  customerId?: string | null;
  actorUserId?: string | null;
};

function contractHref(contractId: string) {
  return `/contracts/${contractId}`;
}

export async function notifyContractCreated(params: ContractNotifyBase): Promise<void> {
  const [leadOwnerId, adminDirectorIds, accountingIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    collectAccountingRecipients(params.actorUserId),
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
          title: 'Hợp đồng đã được tạo',
          body: `Hợp đồng ${params.contractCode} đã được tạo cho khách ${customerName}.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Hợp đồng mới được tạo',
          body: `Dự án ${customerName} đã chuyển sang bước hợp đồng.`,
        },
      },
      {
        recipientUserIds: accountingIds,
        titleBody: {
          title: 'Cần theo dõi hợp đồng mới',
          body: `Hợp đồng ${params.contractCode} đã được tạo. Cần theo dõi hồ sơ và thanh toán liên quan.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.CONTRACT_CREATED,
      module: 'contracts',
      entityType: 'contract',
      entityId: params.contractId,
      href: contractHref(params.contractId),
    },
    params.actorUserId,
  );
}

export async function notifyContractSigned(params: ContractNotifyBase): Promise<void> {
  const [leadOwnerId, adminDirectorIds, accountingIds, customerName] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectAdminDirectorRecipients(params.actorUserId),
    collectAccountingRecipients(params.actorUserId),
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
          title: 'Hợp đồng đã ký',
          body: `Hợp đồng ${params.contractCode} đã được đánh dấu đã ký. Cần chuyển sang thi công.`,
        },
      },
      {
        recipientUserIds: adminDirectorIds,
        titleBody: {
          title: 'Dự án đã chuyển sang thi công',
          body: `Hợp đồng ${params.contractCode} đã ký cho dự án ${customerName}.`,
        },
      },
      {
        recipientUserIds: accountingIds,
        titleBody: {
          title: 'Hợp đồng đã ký, cần theo dõi thanh toán',
          body: `Hợp đồng ${params.contractCode} đã ký. Cần theo dõi các khoản thanh toán.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.CONTRACT_SIGNED,
      module: 'contracts',
      entityType: 'contract',
      entityId: params.contractId,
      href: contractHref(params.contractId),
    },
    params.actorUserId,
  );
}
