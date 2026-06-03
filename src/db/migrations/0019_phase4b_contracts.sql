-- Migration 0019: Phase 4B — Contract MVP (G1)
-- One contract per accepted quotation (unique on quotation_id).

CREATE SEQUENCE "public"."contract_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"survey_id" uuid,
	"quotation_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"contract_value" numeric(15, 2) NOT NULL,
	"signed_at" timestamp,
	"signed_by" uuid,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_code_unique" UNIQUE("code"),
	CONSTRAINT "contracts_quotation_id_unique" UNIQUE("quotation_id")
);--> statement-breakpoint

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_customer_id_idx" ON "contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "contracts_lead_id_idx" ON "contracts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "contracts_quotation_id_idx" ON "contracts" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");
