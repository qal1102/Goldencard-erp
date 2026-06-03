-- Migration 0020: Phase 4C — Contract G2 signed info fields

ALTER TABLE "contracts" ADD COLUMN "signed_document_url" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "customer_signer_name" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "golden_card_signer_name" text;
