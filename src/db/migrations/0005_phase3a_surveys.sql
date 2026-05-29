-- Migration 0005: Phase 3A — Survey MVP
-- Creates the surveys table and survey_code_seq sequence.
-- surveys.customer_id is NOT NULL (survey always belongs to a customer).
-- surveys.lead_id is nullable — stored only to trace the originating lead.
-- Technician assignment is stored in assigned_to (FK to users).

CREATE SEQUENCE "public"."survey_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"address" text NOT NULL,
	"province" varchar(100),
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"roof_type" varchar(50),
	"roof_material" varchar(100),
	"roof_area_m2" numeric(10, 2),
	"roof_orientation" varchar(50),
	"roof_tilt_deg" integer,
	"shading_notes" text,
	"floors" integer,
	"meter_capacity_a" integer,
	"grid_voltage" varchar(50),
	"site_notes" text,
	"internal_notes" text,
	"photos_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "surveys_code_unique" UNIQUE("code")
);--> statement-breakpoint

ALTER TABLE "surveys" ADD CONSTRAINT "surveys_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
