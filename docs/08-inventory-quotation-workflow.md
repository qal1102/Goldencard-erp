# Inventory And Quotation Workflow Notes

This note keeps the inventory-to-quotation flow predictable while the project is moving from demo data to real data.

## Image Handling

Current behavior:

- Inventory items can store either a public `http/https` image URL or a small uploaded `data:image` value.
- Uploaded images are meant for key equipment only, such as panels, inverters, electrical cabinets, and protection devices.
- The quotation print view only shows images for main equipment categories and hides broken images instead of showing a browser error icon.

Do not upload large product photo sets into the database. If inventory images become frequent or large, move image storage to an object storage provider such as Vercel Blob, S3-compatible storage, or a deliberate Supabase Storage integration.

## Quotation Line Rules

- A quotation line linked to an inventory item may show that item in the quotation print equipment section.
- Choosing a quotation template clears the previous inventory item link, so old SKU images do not leak into a new template line.
- Choosing an inventory item fills product name, specification/category, and unit from the inventory catalog.
- Unit price still belongs to quotation/business pricing. Inventory item metadata should not silently set selling price until product pricing is designed.

## Migration Rule

Inventory and quotation schema changes currently belong to the manual migration track. Before applying production schema changes:

1. Add or update the SQL migration file.
2. Update `scripts/manual-migration-config.mjs` if new schema objects must be verified.
3. Run `npm run db:manual:check`.
4. Run `npm run db:manual:verify`.
5. Apply only after explicit production approval.

## Recommended Next Upgrade

Add a real pricing/catalog layer after inventory data is real:

- Inventory item: what the item is.
- Stock movement: how many items are in each warehouse.
- Quotation price catalog: selling price, quote grouping, quote display name, and whether the item is shown as main equipment.

This prevents warehouse data from becoming mixed with sales pricing rules.

The pricing foundation starts with `quotation_price_catalog`:

- `inventory_item_id`: optional link to a real warehouse item/SKU.
- `display_name`: customer-facing name in quotation.
- `unit_price`: selling price used as a quotation suggestion.
- `is_main_equipment`: whether this item may appear in the equipment image section.
- `is_active`: soft on/off switch; do not delete old pricing rows after quotes have used them.
