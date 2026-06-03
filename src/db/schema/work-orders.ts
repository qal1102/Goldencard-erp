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
import { leads } from './leads';
import { quotations } from './quotations';
import { surveys } from './surveys';
import { users } from './users';

export const workOrderCodeSeq = pgSequence('work_order_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const workOrders = pgTable(
  'work_orders',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 30 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    surveyId: uuid('survey_id').references(() => surveys.id, { onDelete: 'set null' }),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
    contractId: uuid('contract_id')
      .notNull()
      .unique()
      .references(() => contracts.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 30 }).notNull().default('draft'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    scheduledStartAt: timestamp('scheduled_start_at'),
    scheduledEndAt: timestamp('scheduled_end_at'),
    installationAddress: text('installation_address'),
    province: varchar('province', { length: 100 }),
    note: text('note'),
    completionNote: text('completion_note'),
    completionDocumentLinks: text('completion_document_links'),
    completedAt: timestamp('completed_at'),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('work_orders_customer_id_idx').on(table.customerId),
    index('work_orders_lead_id_idx').on(table.leadId),
    index('work_orders_contract_id_idx').on(table.contractId),
    index('work_orders_status_idx').on(table.status),
    index('work_orders_assigned_to_idx').on(table.assignedTo),
  ],
);

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
