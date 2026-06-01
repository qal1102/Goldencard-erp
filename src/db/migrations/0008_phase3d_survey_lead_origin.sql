-- Migration 0008: Phase 3D — Survey Lead Origin
-- Allows surveys to be created directly from a Lead before Customer conversion.
-- Removes NOT NULL constraint on surveys.customer_id so a survey can originate
-- from a Lead (lead_id) without a Customer record existing yet.
-- Business rule: at least one of customer_id or lead_id must be present
-- (enforced at the application layer in createSurveySchema).

ALTER TABLE "surveys" ALTER COLUMN "customer_id" DROP NOT NULL;
