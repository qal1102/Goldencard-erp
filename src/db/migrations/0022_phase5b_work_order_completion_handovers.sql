-- Migration 0022: Phase 5B — WorkOrder completion evidence (H2) + Handover MVP (H3)

ALTER TABLE "work_orders" ADD COLUMN "completion_note" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "completion_document_links" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "completed_by" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE SEQUENCE "public"."handover_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"survey_id" uuid,
	"quotation_id" uuid,
	"contract_id" uuid,
	"work_order_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"handover_at" timestamp,
	"handed_over_by" uuid,
	"customer_receiver_name" varchar(255),
	"document_links" text,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "handovers_code_unique" UNIQUE("code"),
	CONSTRAINT "handovers_work_order_id_unique" UNIQUE("work_order_id")
);--> statement-breakpoint

ALTER TABLE "handovers" ADD CONSTRAINT "handovers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_handed_over_by_users_id_fk" FOREIGN KEY ("handed_over_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "handovers_customer_id_idx" ON "handovers" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "handovers_lead_id_idx" ON "handovers" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "handovers_work_order_id_idx" ON "handovers" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "handovers_status_idx" ON "handovers" USING btree ("status");
