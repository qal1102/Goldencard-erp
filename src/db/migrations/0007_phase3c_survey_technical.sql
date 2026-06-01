-- Migration 0007: Phase 3C — Survey Technical Proposal
-- Adds section "Đề xuất kỹ thuật & vật tư" to surveys.
-- Technician fills these fields during on-site survey.
-- These fields drive Quotation auto-generation in a future phase.

ALTER TABLE "surveys" ADD COLUMN "recommended_system_kw" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "panel_wattage_w" integer DEFAULT 550;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "recommended_panel_quantity" integer;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_type" varchar(100);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_quantity" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "system_type" varchar(20);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "power_phase" varchar(20);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "roof_structure_condition" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "needs_roof_reinforcement" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "inverter_location" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "cable_route_distance_m" integer;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "main_breaker_capacity_a" integer;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "main_electrical_cabinet_condition" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "needs_electrical_cabinet_upgrade" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "has_grounding" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "installation_difficulty" varchar(20);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "extra_materials_note" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "installation_plan_note" text;
