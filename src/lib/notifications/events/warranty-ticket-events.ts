import 'server-only';

import {
  collectAdminDirectorRecipients,
  collectCustomerServiceRecipients,
  queryCustomerDisplayName,
  queryLeadOwnerUserId,
} from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';
import type { WarrantyTicketPriority } from '@/modules/warranty-tickets/schema/warranty-ticket.schema';

type WarrantyTicketBaseParams = {
  ticketId: string;
  ticketCode: string;
  issueTitle: string;
  customerId: string;
  leadId?: string | null;
  priority?: WarrantyTicketPriority;
  assignedToUserId?: string | null;
  actorUserId?: string | null;
};

function warrantyHref(ticketId: string) {
  return `/warranty/${ticketId}`;
}

export async function notifyWarrantyTicketCreated(
  params: WarrantyTicketBaseParams,
): Promise<void> {
  const [customerServiceIds, customerName, assignedToUserId] = await Promise.all([
    collectCustomerServiceRecipients(params.actorUserId),
    queryCustomerDisplayName({
      customerId: params.customerId,
      leadId: params.leadId,
    }),
    Promise.resolve(params.assignedToUserId ?? null),
  ]);

  const batches = [
    {
      recipientUserIds: customerServiceIds,
      titleBody: {
        title: 'Yêu cầu bảo hành/CSKH mới',
        body: `Khách ${customerName} có yêu cầu mới: ${params.issueTitle}.`,
      },
    },
  ];

  if (assignedToUserId) {
    batches.push({
      recipientUserIds: [assignedToUserId],
      titleBody: {
        title: 'Bạn được phân công xử lý bảo hành',
        body: `Yêu cầu ${params.ticketCode} đã được phân công cho bạn.`,
      },
    });
  }

  if (params.priority === 'urgent') {
    const adminDirectorIds = await collectAdminDirectorRecipients(params.actorUserId);
    batches.push({
      recipientUserIds: adminDirectorIds,
      titleBody: {
        title: 'Yêu cầu bảo hành khẩn cấp',
        body: `Khách ${customerName} có yêu cầu khẩn cấp: ${params.issueTitle}.`,
      },
    });
  }

  await notifyCategoryBatches(
    batches,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WARRANTY_TICKET_CREATED,
      module: 'warranty',
      entityType: 'warranty_ticket',
      entityId: params.ticketId,
      href: warrantyHref(params.ticketId),
    },
    params.actorUserId,
  );
}

export async function notifyWarrantyTicketAssigned(
  params: WarrantyTicketBaseParams,
): Promise<void> {
  if (!params.assignedToUserId) return;

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: [params.assignedToUserId],
        titleBody: {
          title: 'Bạn được phân công xử lý bảo hành',
          body: `Yêu cầu ${params.ticketCode} đã được phân công cho bạn.`,
        },
      },
    ],
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WARRANTY_TICKET_ASSIGNED,
      module: 'warranty',
      entityType: 'warranty_ticket',
      entityId: params.ticketId,
      href: warrantyHref(params.ticketId),
    },
    params.actorUserId,
  );
}

export async function notifyWarrantyTicketResolved(
  params: WarrantyTicketBaseParams,
): Promise<void> {
  const [leadOwnerId, customerServiceIds, customerName, adminDirectorIds] = await Promise.all([
    queryLeadOwnerUserId(params.leadId),
    collectCustomerServiceRecipients(params.actorUserId),
    queryCustomerDisplayName({
      customerId: params.customerId,
      leadId: params.leadId,
    }),
    params.priority === 'urgent'
      ? collectAdminDirectorRecipients(params.actorUserId)
      : Promise.resolve([] as string[]),
  ]);

  const batches = [
    {
      recipientUserIds: [leadOwnerId],
      titleBody: {
        title: 'Yêu cầu bảo hành đã xử lý',
        body: `Yêu cầu ${params.ticketCode} của khách ${customerName} đã được xử lý.`,
      },
    },
    {
      recipientUserIds: customerServiceIds,
      titleBody: {
        title: 'Yêu cầu bảo hành đã xử lý',
        body: `Yêu cầu ${params.ticketCode}: ${params.issueTitle} đã hoàn tất.`,
      },
    },
  ];

  if (adminDirectorIds.length > 0) {
    batches.push({
      recipientUserIds: adminDirectorIds,
      titleBody: {
        title: 'Yêu cầu bảo hành khẩn cấp đã xử lý',
        body: `Yêu cầu khẩn cấp ${params.ticketCode} của khách ${customerName} đã xử lý.`,
      },
    });
  }

  await notifyCategoryBatches(
    batches,
    {
      actorUserId: params.actorUserId ?? null,
      type: NOTIFICATION_TYPES.WARRANTY_TICKET_RESOLVED,
      module: 'warranty',
      entityType: 'warranty_ticket',
      entityId: params.ticketId,
      href: warrantyHref(params.ticketId),
    },
    params.actorUserId,
  );
}
