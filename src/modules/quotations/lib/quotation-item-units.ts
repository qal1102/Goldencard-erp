export const QUOTATION_ITEM_UNITS = [
  'tấm',
  'bộ',
  'm',
  'm²',
  'gói',
  'kWp',
  'công',
  'khác',
] as const;

export type QuotationItemUnit = (typeof QUOTATION_ITEM_UNITS)[number];

export const QUOTATION_ITEM_UNIT_CUSTOM = 'khác' as const;

export const NUMERIC_UNIT_PATTERN = /^\d+([.,]\d+)?$/;

export function isNumericOnlyUnit(value: string): boolean {
  return NUMERIC_UNIT_PATTERN.test(value.trim());
}

export function isPresetUnit(value: string): value is Exclude<QuotationItemUnit, 'khác'> {
  return QUOTATION_ITEM_UNITS.slice(0, -1).includes(value as Exclude<QuotationItemUnit, 'khác'>);
}
