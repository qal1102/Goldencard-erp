# Migration History Notes

GoldenCard ERP has two migration tracks right now:

- `0000` to `0029`: tracked by Drizzle journal metadata.
- `0030` to `0038`: manual SQL migrations that are intentionally idempotent and verified against production.

Do not edit production data destructively to make the two histories match.

## Current Production State

Production has been verified to include the schema objects introduced by `0030` to `0038`, including:

- Inventory foundation tables: `warehouses`, `inventory_items`, `inventory_stocks`.
- Inventory stock movements and work-order material planning.
- Push subscriptions.
- Project management role/title support.
- Inventory item metadata: `specification`, `image_url`.
- Quotation item to inventory item link: `quotation_items.inventory_item_id`.
- Stock movement document codes: `inventory_stock_movements.document_code`.

## Why Not Patch `_journal.json` Blindly

The Drizzle journal currently does not contain entries for `0030` to `0038`, and the production `drizzle.__drizzle_migrations` table does not provide a complete row-by-row history for those files.

Adding journal entries without matching snapshots/hash history can make future `drizzle-kit migrate` behavior misleading. Treat `0030` to `0038` as the manual baseline until a proper Drizzle baseline migration is created.

## Safe Commands

Use these for the manual baseline:

```bash
npm run db:manual:verify
npm run db:manual:migrate
npm run db:manual:verify
```

The manual migrate script:

- Uses `DATABASE_URL_DIRECT` from `.env.local`.
- Applies only `0030` to `0038`.
- Runs SQL statement-by-statement using migration breakpoints.
- Uses a Postgres advisory lock to avoid concurrent manual migration runs.
- Relies on `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, or duplicate-object guards in the SQL files.

## Future Schema Changes

Before adding a new DB migration:

1. Inspect the real production table/columns first.
2. Prefer additive, idempotent SQL: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and guarded FK creation.
3. Run `npm run db:manual:verify` after applying migrations.
4. Keep the new migration in the manual track unless/until the Drizzle journal is deliberately re-baselined.

## Proper Re-Baseline Later

A full Drizzle re-baseline should be a separate maintenance task:

1. Export/inspect production schema.
2. Generate a fresh Drizzle snapshot that matches production.
3. Test on a disposable database.
4. Only then replace the mixed manual history with a consistent Drizzle baseline.

Do not do this during feature work.
