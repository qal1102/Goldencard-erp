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
import { workOrders } from './work-orders';

export const handoverCodeSeq = pgSequence('handover_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const handovers = pgTable(
  'handovers',
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
    workOrderId: uuid('work_order_id')
      .notNull()
      .unique()
      .references(() => workOrders.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 30 }).notNull().default('draft'),
    handoverAt: timestamp('handover_at'),
    handedOverBy: uuid('handed_over_by').references(() => users.id, { onDelete: 'set null' }),
    customerReceiverName: varchar('customer_receiver_name', { length: 255 }),
    documentLinks: text('document_links'),
    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('handovers_customer_id_idx').on(table.customerId),
    index('handovers_lead_id_idx').on(table.leadId),
    index('handovers_work_order_id_idx').on(table.workOrderId),
    index('handovers_status_idx').on(table.status),
  ],
);

export type Handover = typeof handovers.$inferSelect;
export type NewHandover = typeof handovers.$inferInsert;
