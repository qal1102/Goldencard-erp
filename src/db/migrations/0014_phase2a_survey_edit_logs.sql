CREATE TABLE "survey_edit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"edited_at" timestamp DEFAULT now() NOT NULL,
	"note" text NOT NULL,
	"before_status" varchar,
	"after_status" varchar
);
--> statement-breakpoint
ALTER TABLE "survey_edit_logs" ADD CONSTRAINT "survey_edit_logs_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_edit_logs" ADD CONSTRAINT "survey_edit_logs_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_edit_logs_survey_id_edited_at_idx" ON "survey_edit_logs" USING btree ("survey_id","edited_at" DESC);
