import { sql } from 'drizzle-orm';
import {
  boolean,
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
  // customer_id is nullable — survey can originate from a Lead before Customer exists
  customerId: uuid('customer_id')
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
  // Technical proposal fields — filled by technician during survey
  // Used to auto-generate Quotation items in a future phase
  recommendedSystemKw: numeric('recommended_system_kw', { precision: 10, scale: 2 }),
  panelWattageW: integer('panel_wattage_w').default(550),
  recommendedPanelQuantity: integer('recommended_panel_quantity'),
  inverterType: varchar('inverter_type', { length: 100 }),
  inverterQuantity: integer('inverter_quantity').default(1),
  systemType: varchar('system_type', { length: 20 }),
  powerPhase: varchar('power_phase', { length: 20 }),
  roofStructureCondition: text('roof_structure_condition'),
  needsRoofReinforcement: boolean('needs_roof_reinforcement').default(false),
  inverterLocation: text('inverter_location'),
  cableRouteDistanceM: integer('cable_route_distance_m'),
  mainBreakerCapacityA: integer('main_breaker_capacity_a'),
  mainElectricalCabinetCondition: text('main_electrical_cabinet_condition'),
  needsElectricalCabinetUpgrade: boolean('needs_electrical_cabinet_upgrade').default(false),
  hasGrounding: boolean('has_grounding').default(false),
  installationDifficulty: varchar('installation_difficulty', { length: 20 }),
  extraMaterialsNote: text('extra_materials_note'),
  installationPlanNote: text('installation_plan_note'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
