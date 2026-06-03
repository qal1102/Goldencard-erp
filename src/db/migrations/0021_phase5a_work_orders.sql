-- Migration 0021: Phase 5A — Work Order MVP (H1)
-- One work order per signed contract (unique on contract_id).

CREATE SEQUENCE "public"."work_order_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"survey_id" uuid,
	"quotation_id" uuid,
	"contract_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"assigned_to" uuid,
	"scheduled_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"installation_address" text,
	"province" varchar(100),
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_code_unique" UNIQUE("code"),
	CONSTRAINT "work_orders_contract_id_unique" UNIQUE("contract_id")
);--> statement-breakpoint

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_orders_customer_id_idx" ON "work_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_orders_lead_id_idx" ON "work_orders" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "work_orders_contract_id_idx" ON "work_orders" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "work_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "work_orders_assigned_to_idx" ON "work_orders" USING btree ("assigned_to");
