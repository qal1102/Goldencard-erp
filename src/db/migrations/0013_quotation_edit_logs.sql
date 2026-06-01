CREATE TABLE "quotation_edit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"edited_at" timestamp DEFAULT now() NOT NULL,
	"note" text NOT NULL,
	"before_total" numeric,
	"after_total" numeric,
	"before_status" varchar,
	"after_status" varchar
);
--> statement-breakpoint
ALTER TABLE "quotation_edit_logs" ADD CONSTRAINT "quotation_edit_logs_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_edit_logs" ADD CONSTRAINT "quotation_edit_logs_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_edit_logs_quotation_id_edited_at_idx" ON "quotation_edit_logs" USING btree ("quotation_id","edited_at" DESC);
