import { sql } from 'drizzle-orm';
import {
  index,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { customers } from './customers';
import { handovers } from './handovers';
import { leads } from './leads';
import { quotations } from './quotations';
import { surveys } from './surveys';
import { users } from './users';
import { workOrders } from './work-orders';

export const warrantyTicketCodeSeq = pgSequence('warranty_ticket_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const warrantyTickets = pgTable(
  'warranty_tickets',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 30 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    surveyId: uuid('survey_id').references(() => surveys.id, { onDelete: 'set null' }),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
    contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
    handoverId: uuid('handover_id').references(() => handovers.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 30 }).notNull().default('open'),
    priority: varchar('priority', { length: 30 }).notNull().default('normal'),
    issueTitle: varchar('issue_title', { length: 255 }).notNull(),
    issueDescription: text('issue_description'),
    customerContactName: varchar('customer_contact_name', { length: 255 }),
    customerContactPhone: varchar('customer_contact_phone', { length: 50 }),
    reportedAt: timestamp('reported_at').defaultNow().notNull(),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    scheduledAt: timestamp('scheduled_at'),
    resolutionNote: text('resolution_note'),
    documentLinks: text('document_links'),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: uuid('cancelled_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('warranty_tickets_customer_id_idx').on(table.customerId),
    index('warranty_tickets_lead_id_idx').on(table.leadId),
    index('warranty_tickets_handover_id_idx').on(table.handoverId),
    index('warranty_tickets_status_idx').on(table.status),
    index('warranty_tickets_priority_idx').on(table.priority),
    index('warranty_tickets_assigned_to_idx').on(table.assignedTo),
    index('warranty_tickets_created_at_idx').on(table.createdAt),
  ],
);

export type WarrantyTicket = typeof warrantyTickets.$inferSelect;
export type NewWarrantyTicket = typeof warrantyTickets.$inferInsert;
