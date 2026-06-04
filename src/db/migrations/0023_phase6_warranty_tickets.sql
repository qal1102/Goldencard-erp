-- Migration 0023: Phase 6 — Warranty / Customer Care MVP (H4)

CREATE SEQUENCE "public"."warranty_ticket_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "warranty_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"survey_id" uuid,
	"quotation_id" uuid,
	"contract_id" uuid,
	"work_order_id" uuid,
	"handover_id" uuid,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"priority" varchar(30) DEFAULT 'normal' NOT NULL,
	"issue_title" varchar(255) NOT NULL,
	"issue_description" text,
	"customer_contact_name" varchar(255),
	"customer_contact_phone" varchar(50),
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" uuid,
	"scheduled_at" timestamp,
	"resolution_note" text,
	"document_links" text,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warranty_tickets_code_unique" UNIQUE("code")
);--> statement-breakpoint

ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_handover_id_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."handovers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_tickets" ADD CONSTRAINT "warranty_tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warranty_tickets_customer_id_idx" ON "warranty_tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "warranty_tickets_lead_id_idx" ON "warranty_tickets" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "warranty_tickets_handover_id_idx" ON "warranty_tickets" USING btree ("handover_id");--> statement-breakpoint
CREATE INDEX "warranty_tickets_status_idx" ON "warranty_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warranty_tickets_priority_idx" ON "warranty_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "warranty_tickets_assigned_to_idx" ON "warranty_tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "warranty_tickets_created_at_idx" ON "warranty_tickets" USING btree ("created_at");
