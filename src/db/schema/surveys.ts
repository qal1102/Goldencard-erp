import { sql } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { leads } from './leads';
import { users } from './users';

export const surveyCodeSeq = pgSequence('survey_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cache: 1,
});

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).notNull().unique(),
  // customer_id is required — survey always belongs to a customer
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  // lead_id is optional — stored for traceability only
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  address: text('address').notNull(),
  province: varchar('province', { length: 100 }),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  // Site survey fields
  roofType: varchar('roof_type', { length: 50 }),
  roofMaterial: varchar('roof_material', { length: 100 }),
  roofAreaM2: numeric('roof_area_m2', { precision: 10, scale: 2 }),
  roofOrientation: varchar('roof_orientation', { length: 50 }),
  roofTiltDeg: integer('roof_tilt_deg'),
  shadingNotes: text('shading_notes'),
  floors: integer('floors'),
  meterCapacityA: integer('meter_capacity_a'),
  gridVoltage: varchar('grid_voltage', { length: 50 }),
  siteNotes: text('site_notes'),
  internalNotes: text('internal_notes'),
  // Photos placeholder — upload will be added in a future update
  photosNote: text('photos_note'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
