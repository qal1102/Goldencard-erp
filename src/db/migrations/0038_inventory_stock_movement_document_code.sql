ALTER TABLE "inventory_stock_movements" ADD COLUMN IF NOT EXISTS "document_code" varchar(30);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_stock_movements_document_code_idx" ON "inventory_stock_movements" USING btree ("document_code");
