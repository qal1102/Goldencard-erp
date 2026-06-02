-- Phase 2C-2: Lead call workflow + consultation fields

ALTER TABLE "leads" ADD COLUMN "consultation_note" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "customer_requirements" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "preferred_install_time" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "follow_up_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_contacted_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_contacted_by" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_call_result" varchar(50);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_last_contacted_by_users_id_fk" FOREIGN KEY ("last_contacted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
