ALTER TABLE "quotation_items" ADD COLUMN IF NOT EXISTS "inventory_item_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quotation_items_inventory_item_id_idx" ON "quotation_items" USING btree ("inventory_item_id");
