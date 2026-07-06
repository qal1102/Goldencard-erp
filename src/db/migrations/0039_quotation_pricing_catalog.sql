CREATE TABLE IF NOT EXISTS "quotation_price_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inventory_item_id" uuid,
  "display_name" varchar(255) NOT NULL,
  "description" text,
  "category" varchar(120),
  "unit" varchar(50) NOT NULL,
  "unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
  "is_main_equipment" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "note" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_price_catalog" ADD CONSTRAINT "quotation_price_catalog_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_price_catalog" ADD CONSTRAINT "quotation_price_catalog_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_price_catalog" ADD CONSTRAINT "quotation_price_catalog_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quotation_price_catalog_inventory_item_uidx" ON "quotation_price_catalog" USING btree ("inventory_item_id") WHERE "inventory_item_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_price_catalog_category_idx" ON "quotation_price_catalog" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_price_catalog_is_active_idx" ON "quotation_price_catalog" USING btree ("is_active");
