import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { surveys } from './surveys';

export const surveyZones = pgTable(
  'survey_zones',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    zoneName: varchar('zone_name', { length: 100 }).notNull(),
    roofType: varchar('roof_type', { length: 50 }),
    roofMaterial: varchar('roof_material', { length: 100 }),
    usableAreaM2: numeric('usable_area_m2', { precision: 10, scale: 2 }),
    roofOrientation: varchar('roof_orientation', { length: 50 }),
    roofTiltDeg: integer('roof_tilt_deg'),
    shadingNotes: text('shading_notes'),
    roofStructureCondition: text('roof_structure_condition'),
    needsRoofReinforcement: boolean('needs_roof_reinforcement').notNull().default(false),
    recommendedSystemKw: numeric('recommended_system_kw', { precision: 10, scale: 2 }),
    panelWattageW: integer('panel_wattage_w').notNull().default(550),
    recommendedPanelQuantity: integer('recommended_panel_quantity'),
    inverterLocation: text('inverter_location'),
    cableRouteDistanceM: integer('cable_route_distance_m'),
    cableRouteNotes: text('cable_route_notes'),
    installationDifficulty: varchar('installation_difficulty', { length: 20 }),
    extraMaterialsNote: text('extra_materials_note'),
    installationPlanNote: text('installation_plan_note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('survey_zones_survey_id_idx').on(table.surveyId),
    uniqueIndex('survey_zones_survey_sort_idx').on(table.surveyId, table.sortOrder),
  ],
);

export type SurveyZone = typeof surveyZones.$inferSelect;
export type NewSurveyZone = typeof surveyZones.$inferInsert;
