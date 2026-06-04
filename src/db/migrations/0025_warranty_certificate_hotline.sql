-- Migration 0025: Update warranty certificate support hotline to 0333314288

UPDATE "warranty_certificates"
SET
  "support_phone" = '0333314288',
  "updated_at" = now()
WHERE
  "support_phone" IS NULL
  OR regexp_replace("support_phone", '\D', '', 'g') = '0903117277';
