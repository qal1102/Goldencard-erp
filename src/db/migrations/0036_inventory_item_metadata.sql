ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "specification" varchar(255);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "image_url" text;
