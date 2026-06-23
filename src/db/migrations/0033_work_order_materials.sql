CREATE TABLE IF NOT EXISTS "work_order_materials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "work_order_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "planned_quantity" numeric(12, 3) NOT NULL,
  "reserved_quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
  "issued_quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
  "status" varchar(20) DEFAULT 'planned' NOT NULL,
  "note" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "work_order_materials_work_order_id_work_orders_id_fk"
    FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "work_order_materials_item_id_inventory_items_id_fk"
    FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "work_order_materials_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action,
  CONSTRAINT "work_order_materials_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action,
  CONSTRAINT "work_order_materials_planned_quantity_check"
    CHECK ("planned_quantity" > 0),
  CONSTRAINT "work_order_materials_reserved_quantity_check"
    CHECK ("reserved_quantity" >= 0),
  CONSTRAINT "work_order_materials_issued_quantity_check"
    CHECK ("issued_quantity" >= 0),
  CONSTRAINT "work_order_materials_status_check"
    CHECK ("status" IN ('planned', 'approved', 'partially_issued', 'issued', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_materials_work_order_item_uidx"
  ON "work_order_materials" USING btree ("work_order_id", "item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_materials_work_order_id_idx"
  ON "work_order_materials" USING btree ("work_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_materials_item_id_idx"
  ON "work_order_materials" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_materials_status_idx"
  ON "work_order_materials" USING btree ("status");
