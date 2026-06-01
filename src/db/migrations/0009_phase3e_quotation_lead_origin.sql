-- Migration 0009: Phase 3E — Quotation Lead Origin
-- Allows quotations to be created from a lead-origin survey (no Customer yet).
-- Drops NOT NULL from quotations.customer_id so a quotation can be created
-- when only a Lead exists. Snapshot fields (customer_name_snapshot etc.) hold
-- the display data sourced from the lead; customer_id is set later when the
-- lead is converted to a Customer (out of scope for this phase).

ALTER TABLE "quotations" ALTER COLUMN "customer_id" DROP NOT NULL;
