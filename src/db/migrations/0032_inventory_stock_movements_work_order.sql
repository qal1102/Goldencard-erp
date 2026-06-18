ALTER TABLE "inventory_stock_movements" ADD COLUMN IF NOT EXISTS "work_order_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_stock_movements" ADD CONSTRAINT "inventory_stock_movements_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_stock_movements_work_order_id_idx" ON "inventory_stock_movements" USING btree ("work_order_id");
