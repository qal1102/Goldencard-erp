import { QUOTATION_ITEM_DEFAULT_PRICES } from './generate-quotation-items';

// Future: replace MVP in-code templates with Product/SKU + Inventory availability.

export type QuotationItemTemplate = {
  /** Internal key — not shown in UI. */
  id: string;
  /** User-facing label for template dropdown. */
  label: string;
  productName: string;
  description: string;
  unit: string;
  unitPrice: number;
};

export function getQuotationItemTemplates(panelWattageW = 550): QuotationItemTemplate[] {
  const prices = QUOTATION_ITEM_DEFAULT_PRICES;

  return [
    {
      id: 'panel',
      label: `Tấm pin năng lượng mặt trời ${panelWattageW}W`,
      productName: `Tấm pin năng lượng mặt trời ${panelWattageW}W`,
      description: 'Thiết bị chính',
      unit: 'tấm',
      unitPrice: prices.panelPerUnit,
    },
    {
      id: 'inverter',
      label: 'Inverter / Bộ hòa lưới',
      productName: 'Inverter / Bộ hòa lưới',
      description: 'Thiết bị chính',
      unit: 'bộ',
      unitPrice: prices.inverterPerSet,
    },
    {
      id: 'rail',
      label: 'Hệ khung rail & phụ kiện mái',
      productName: 'Hệ khung rail & phụ kiện mái',
      description: 'Khung & mái',
      unit: 'kWp',
      unitPrice: prices.railPerKwp,
    },
    {
      id: 'dc-cable',
      label: 'Dây DC & đầu nối MC4',
      productName: 'Dây DC & đầu nối MC4',
      description: 'Vật tư DC',
      unit: 'bộ',
      unitPrice: prices.dcCableSet,
    },
    {
      id: 'dc-protection',
      label: 'Thiết bị bảo vệ DC',
      productName: 'Thiết bị bảo vệ DC',
      description: 'Vật tư DC',
      unit: 'bộ',
      unitPrice: prices.dcProtectionSet,
    },
    {
      id: 'ac-cable',
      label: 'Dây AC & phụ kiện đấu nối',
      productName: 'Dây AC & phụ kiện đấu nối',
      description: 'Vật tư AC',
      unit: 'bộ',
      unitPrice: prices.acCableSet,
    },
    {
      id: 'ac-cabinet',
      label: 'Tủ điện, CB, thiết bị bảo vệ AC',
      productName: 'Tủ điện, CB, thiết bị bảo vệ AC',
      description: 'Vật tư AC',
      unit: 'bộ',
      unitPrice: prices.acCabinetSet,
    },
    {
      id: 'grounding',
      label: 'Chống sét & tiếp địa',
      productName: 'Chống sét & tiếp địa hệ thống',
      description: 'An toàn & tiếp địa',
      unit: 'bộ',
      unitPrice: prices.groundingSet,
    },
    {
      id: 'labor',
      label: 'Nhân công lắp đặt',
      productName: 'Nhân công lắp đặt',
      description: 'Thi công',
      unit: 'kWp',
      unitPrice: prices.laborPerKwp,
    },
  ];
}
