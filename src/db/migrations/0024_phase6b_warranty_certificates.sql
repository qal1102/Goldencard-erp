-- Migration 0024: Phase 6b — Warranty certificates + public QR (H4.1)

CREATE SEQUENCE "public"."warranty_certificate_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint

CREATE TABLE "warranty_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"public_token" varchar(100) NOT NULL,
	"customer_id" uuid NOT NULL,
	"lead_id" uuid,
	"survey_id" uuid,
	"quotation_id" uuid,
	"contract_id" uuid,
	"work_order_id" uuid,
	"handover_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"warranty_start_at" timestamp,
	"warranty_end_at" timestamp,
	"warranty_terms" text,
	"support_phone" varchar(50),
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warranty_certificates_code_unique" UNIQUE("code"),
	CONSTRAINT "warranty_certificates_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "warranty_certificates_handover_id_unique" UNIQUE("handover_id")
);--> statement-breakpoint

ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_handover_id_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."handovers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_certificates" ADD CONSTRAINT "warranty_certificates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warranty_certificates_customer_id_idx" ON "warranty_certificates" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "warranty_certificates_handover_id_idx" ON "warranty_certificates" USING btree ("handover_id");--> statement-breakpoint
CREATE INDEX "warranty_certificates_status_idx" ON "warranty_certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warranty_certificates_public_token_idx" ON "warranty_certificates" USING btree ("public_token");
