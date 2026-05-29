-- Migration 0004: CRM business rule refinements
-- - address required on leads and customers
-- - referral source fields added to leads and customers
-- - phone 9-11 digits (enforced at application layer; DB column stays varchar(20))
-- - customer_code_seq already in place from 0003 (KH0001 pattern)
-- - lead_code_seq already in place from 0002 (LEAD-0001 pattern)
-- TODO: referral commission payout logic to be added in accounting/finance module

-- 1. Make address NOT NULL in leads (preserve existing data as empty string)
UPDATE "leads" SET "address" = '' WHERE "address" IS NULL;
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "address" SET NOT NULL;
--> statement-breakpoint

-- 2. Add referral fields to leads
ALTER TABLE "leads" ADD COLUMN "referrer_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "referrer_phone" varchar(20);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "referral_note" text;
--> statement-breakpoint

-- 3. Make address NOT NULL in customers (preserve existing data as empty string)
UPDATE "customers" SET "address" = '' WHERE "address" IS NULL;
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "address" SET NOT NULL;
--> statement-breakpoint

-- 4. Add referral fields to customers (carried forward from lead at conversion time)
ALTER TABLE "customers" ADD COLUMN "referrer_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "referrer_phone" varchar(20);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "referral_note" text;
