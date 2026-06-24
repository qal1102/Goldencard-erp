# Migration status

Last checked: 2026-06-24.

## Summary

The production database schema currently has the inventory and work-order material tables required by migrations `0030` through `0033`.

Verified tables:

- `warehouses`
- `inventory_items`
- `inventory_stocks`
- `inventory_stock_movements`
- `work_order_materials`

Verified inventory/BOM indexes and constraints are present, including:

- `inventory_items_sku_unique`
- `inventory_stocks_warehouse_item_uidx`
- `inventory_stock_movements_work_order_id_idx`
- `work_order_materials_work_order_item_uidx`
- Foreign keys from inventory/BOM tables to users, warehouses, inventory items, and work orders
- Work-order material quantity/status check constraints

## Known tracking mismatch

Local migration files exist through:

- `0030_inventory_foundation.sql`
- `0031_inventory_stock_movements.sql`
- `0032_inventory_stock_movements_work_order.sql`
- `0033_work_order_materials.sql`

However, `src/db/migrations/meta/_journal.json` currently lists entries only through `0029_warranty_tickets_safe`.

The production `drizzle.__drizzle_migrations` table is also not a reliable complete source of truth for this project history. It currently contains only a single Drizzle migration row, while the real schema has many manually applied migrations.

## Impact

Runtime impact: none observed.

The app can use the inventory and work-order material schema because the real production tables, columns, indexes, and constraints exist.

Operational impact: migration tooling is risky if treated as authoritative.

Do not assume `drizzle-kit migrate` knows the true production migration history until the migration tracking approach is reconciled.

## Safe operating rules

- Do not run production migrations automatically from the current journal state.
- Before any new production schema change, inspect real production tables/columns first.
- Prefer idempotent SQL using `IF NOT EXISTS` for additive changes.
- Keep manual migration SQL files committed and documented.
- If migration tracking is repaired later, do it as a separate maintenance task with a verified backup and no business-logic changes.

## Recommended next step

For the next schema change, create a new additive SQL migration and apply it manually after inspection and explicit approval. Do not try to replay old migrations from `0030` to `0033`; those schema objects already exist in production.
