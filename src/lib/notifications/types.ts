export const NOTIFICATION_TYPES = {
  SURVEY_ASSIGNED: 'survey.assigned',
  SURVEY_COMPLETED: 'survey.completed',
  SURVEY_CORRECTED_AFTER_QUOTATION: 'survey.corrected_after_quotation',
  QUOTATION_CREATED: 'quotation.created',
  QUOTATION_SENT: 'quotation.sent',
  QUOTATION_EDITED_AFTER_SENT: 'quotation.edited_after_sent',
  QUOTATION_ACCEPTED: 'quotation.accepted',
  QUOTATION_REJECTED: 'quotation.rejected',
  QUOTATION_NEEDS_REVISION: 'quotation.needs_revision',
  QUOTATION_NO_RESPONSE: 'quotation.no_response',
  QUOTATION_EXPIRED: 'quotation.expired',
  CONTRACT_CREATED: 'contract.created',
  CONTRACT_SIGNED: 'contract.signed',
  WORK_ORDER_CREATED: 'work_order.created',
  WORK_ORDER_ASSIGNED: 'work_order.assigned',
  WORK_ORDER_COMPLETED: 'work_order.completed',
  HANDOVER_CREATED: 'handover.created',
  HANDOVER_COMPLETED: 'handover.completed',
  WARRANTY_TICKET_CREATED: 'warranty_ticket.created',
  WARRANTY_TICKET_ASSIGNED: 'warranty_ticket.assigned',
  WARRANTY_TICKET_RESOLVED: 'warranty_ticket.resolved',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  href?: string | null;
};

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  module: string;
  entityType: string;
  entityId: string | null;
  href: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationsOptions = {
  actorUserId?: string | null;
  /** When false (default), the actor is excluded from recipients. */
  includeActor?: boolean;
};
