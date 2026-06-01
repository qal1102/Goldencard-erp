-- Migration 0010: Phase 3F — Quotation Workflow (schema foundation)
-- Adds revision support, discount/VAT persistence, send/response audit fields,
-- content locking, and export audit table.
-- Drops one-quotation-per-survey UNIQUE(survey_id) in favour of
-- UNIQUE(survey_id, revision_number).

ALTER TABLE "quotations" ADD COLUMN "revision_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_type" varchar(20);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_value" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "vat_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "content_locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_by" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_channel" varchar(20);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_note" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "response_note" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "responded_by" uuid;--> statement-breakpoint
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_survey_id_unique";--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_survey_id_revision_number_unique" UNIQUE("survey_id", "revision_number");--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "quotation_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"format" varchar(20) NOT NULL,
	"exported_by" uuid NOT NULL,
	"exported_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "quotation_exports" ADD CONSTRAINT "quotation_exports_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_exports" ADD CONSTRAINT "quotation_exports_exported_by_users_id_fk" FOREIGN KEY ("exported_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_exports_quotation_id_exported_at_idx" ON "quotation_exports" USING btree ("quotation_id", "exported_at" DESC);
