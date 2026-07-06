export const manualMigrationFiles = [
  '0030_inventory_foundation.sql',
  '0031_inventory_stock_movements.sql',
  '0032_inventory_stock_movements_work_order.sql',
  '0033_work_order_materials.sql',
  '0034_push_subscriptions.sql',
  '0035_project_management_roles.sql',
  '0036_inventory_item_metadata.sql',
  '0037_quotation_item_inventory_link.sql',
  '0038_inventory_stock_movement_document_code.sql',
  '0039_quotation_pricing_catalog.sql',
];

export const requiredSchemaChecks = {
  tables: [
    'warehouses',
    'inventory_items',
    'inventory_stocks',
    'inventory_stock_movements',
    'work_order_materials',
    'push_subscriptions',
    'quotation_price_catalog',
  ],
  columns: [
    ['inventory_stock_movements', 'work_order_id'],
    ['inventory_stock_movements', 'document_code'],
    ['inventory_items', 'specification'],
    ['inventory_items', 'image_url'],
    ['quotation_items', 'inventory_item_id'],
    ['users', 'job_title'],
    ['quotation_price_catalog', 'inventory_item_id'],
    ['quotation_price_catalog', 'unit_price'],
    ['quotation_price_catalog', 'is_main_equipment'],
  ],
  indexes: [
    'inventory_stock_movements_work_order_id_idx',
    'inventory_stock_movements_document_code_idx',
    'work_order_materials_work_order_id_idx',
    'push_subscriptions_user_id_idx',
    'quotation_items_inventory_item_id_idx',
    'quotation_price_catalog_inventory_item_uidx',
    'quotation_price_catalog_is_active_idx',
  ],
  constraints: [
    'quotation_items_inventory_item_id_inventory_items_id_fk',
    'quotation_price_catalog_inventory_item_id_inventory_items_id_fk',
  ],
};
