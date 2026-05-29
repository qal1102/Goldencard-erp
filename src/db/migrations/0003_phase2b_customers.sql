CREATE SEQUENCE "public"."customer_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "province" varchar(100);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "converted_by" uuid;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_by" uuid;
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_lead_id_unique" UNIQUE("lead_id");
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_converted_by_users_id_fk" FOREIGN KEY ("converted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_by_users_id_fk" FOREIGN KEY ("converted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
