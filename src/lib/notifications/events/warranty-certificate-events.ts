import 'server-only';

import { collectCustomerServiceRecipients, queryCustomerDisplayName } from '../recipients';
import { notifyCategoryBatches } from '../notify-category-batches';
import { NOTIFICATION_TYPES } from '../types';

export async function notifyWarrantyTicketFromPublicQr(params: {
  ticketId: string;
  ticketCode: string;
  issueTitle: string;
  customerId: string;
  leadId?: string | null;
}): Promise<void> {
  const [customerServiceIds, customerName] = await Promise.all([
    collectCustomerServiceRecipients(null),
    queryCustomerDisplayName({
      customerId: params.customerId,
      leadId: params.leadId,
    }),
  ]);

  await notifyCategoryBatches(
    [
      {
        recipientUserIds: customerServiceIds,
        titleBody: {
          title: 'Yêu cầu bảo hành mới từ QR',
          body: `Khách ${customerName} gửi yêu cầu: ${params.issueTitle}.`,
        },
      },
    ],
    {
      actorUserId: null,
      type: NOTIFICATION_TYPES.WARRANTY_TICKET_CREATED,
      module: 'warranty',
      entityType: 'warranty_ticket',
      entityId: params.ticketId,
      href: `/warranty/${params.ticketId}`,
    },
    null,
  );
}
