-- Migration 0006: Phase 3B — Quotation MVP
-- Creates quotation_code_seq, quotations, and quotation_items tables.
-- quotations.survey_id has a UNIQUE constraint — one quotation per survey (MVP only).
-- This UNIQUE constraint is TEMPORARY and must be dropped via a future migration
-- when quotation revisions are introduced (replace with revision_number +
-- a composite UNIQUE on (survey_id, revision_number)).
-- Snapshot fields (customer_name_snapshot, customer_phone_snapshot,
-- customer_address_snapshot) are written once at creation time from the customer
-- record and must never be overwritten.

CREATE SEQUENCE "public"."quotation_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"customer_id" uuid NOT NULL,
	"survey_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"valid_until" date,
	"note" text,
	"customer_name_snapshot" varchar(255) NOT NULL,
	"customer_phone_snapshot" varchar(50),
	"customer_address_snapshot" text,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"accepted_at" timestamp,
	"accepted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_code_unique" UNIQUE("code"),
	CONSTRAINT "quotations_survey_id_unique" UNIQUE("survey_id")
);--> statement-breakpoint

CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"description" text,
	"quantity" numeric(10, 3) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"line_total" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
