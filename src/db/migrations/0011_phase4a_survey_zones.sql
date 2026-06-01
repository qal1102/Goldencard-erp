-- Migration 0011: Phase 4A — Survey Multi-Zone (schema foundation)
-- Creates survey_zones child table for per-roof/site zone technical data.
-- Adds project-level electrical infrastructure columns to surveys.
-- Legacy single-roof columns on surveys are unchanged.

CREATE TABLE "survey_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"zone_name" varchar(100) NOT NULL,
	"roof_type" varchar(50),
	"roof_material" varchar(100),
	"usable_area_m2" numeric(10, 2),
	"roof_orientation" varchar(50),
	"roof_tilt_deg" integer,
	"shading_notes" text,
	"roof_structure_condition" text,
	"needs_roof_reinforcement" boolean DEFAULT false NOT NULL,
	"recommended_system_kw" numeric(10, 2),
	"panel_wattage_w" integer DEFAULT 550 NOT NULL,
	"recommended_panel_quantity" integer,
	"inverter_location" text,
	"cable_route_distance_m" integer,
	"cable_route_notes" text,
	"installation_difficulty" varchar(20),
	"extra_materials_note" text,
	"installation_plan_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "survey_zones" ADD CONSTRAINT "survey_zones_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_zones_survey_id_idx" ON "survey_zones" USING btree ("survey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_zones_survey_sort_idx" ON "survey_zones" USING btree ("survey_id", "sort_order");--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "project_scale" varchar(20) DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "planned_inverter_area" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_area_near_main_power" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_area_distance_to_main_cabinet_m" integer;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_area_clean_dry_ventilated" boolean;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_area_has_shelter" boolean;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_area_risk_notes" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "needs_inverter_shelter_or_rack" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "main_power_connection_point" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "main_cabinet_location" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "grounding_location" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "main_cable_route_notes" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "maintenance_access_notes" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "fire_safety_notes" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "general_technical_risk_notes" text;
