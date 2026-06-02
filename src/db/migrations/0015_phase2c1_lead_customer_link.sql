-- Phase 2C-1: Customer master + lead linking foundation
-- Adds leads.customer_id FK to customers (master contact record)

ALTER TABLE "leads" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_customer_id_idx" ON "leads" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint

-- Backfill: legacy customers.lead_id → leads.customer_id
UPDATE "leads" AS l
SET "customer_id" = c."id"
FROM "customers" AS c
WHERE c."lead_id" = l."id"
  AND l."customer_id" IS NULL;--> statement-breakpoint

-- Backfill: match by phone when still unlinked
UPDATE "leads" AS l
SET "customer_id" = c."id"
FROM "customers" AS c
WHERE l."customer_id" IS NULL
  AND l."phone" = c."phone";
