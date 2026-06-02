ALTER TABLE "surveys" ADD COLUMN "checked_in_latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "checked_in_longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "checked_in_accuracy_m" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "checked_in_by" uuid;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "check_in_note" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
