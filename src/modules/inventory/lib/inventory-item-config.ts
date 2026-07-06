export const inventoryCategoryOptions = [
  {
    value: 'Tấm pin',
    prefix: 'PIN',
    defaultMinStock: 10,
    hint: 'Tấm pin năng lượng mặt trời theo công suất/quy cách.',
  },
  {
    value: 'Inverter',
    prefix: 'INV',
    defaultMinStock: 1,
    hint: 'Biến tần, inverter hybrid/on-grid/off-grid.',
  },
  {
    value: 'Dây điện',
    prefix: 'DAY',
    defaultMinStock: 100,
    hint: 'Dây DC/AC, cáp nguồn, dây tiếp địa.',
  },
  {
    value: 'Tủ điện',
    prefix: 'TD',
    defaultMinStock: 1,
    hint: 'Tủ AC/DC, tủ combiner, tủ bảo vệ.',
  },
  {
    value: 'Khung/rail',
    prefix: 'RAIL',
    defaultMinStock: 20,
    hint: 'Rail, khung đỡ, thanh nhôm, phụ kiện gá lắp chính.',
  },
  {
    value: 'Phụ kiện',
    prefix: 'PK',
    defaultMinStock: 50,
    hint: 'Kẹp, jack MC4, cos, đầu nối, bulong, vật tư phụ.',
  },
  {
    value: 'Dụng cụ thi công',
    prefix: 'DC',
    defaultMinStock: 1,
    hint: 'Máy móc, dụng cụ và thiết bị dùng cho đội thi công.',
  },
  {
    value: 'Thiết bị bảo vệ',
    prefix: 'TBV',
    defaultMinStock: 5,
    hint: 'CB, SPD, cầu chì, chống sét và thiết bị bảo vệ.',
  },
] as const;

export const inventoryCategoryValues = inventoryCategoryOptions.map((option) => option.value);

export function getInventoryCategoryOption(category?: string | null) {
  return inventoryCategoryOptions.find((option) => option.value === category);
}

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .trim();
}

export function getInventorySkuPrefix(category?: string | null, name?: string | null) {
  const exact = getInventoryCategoryOption(category);
  if (exact) return exact.prefix;

  const text = `${normalizeText(category)} ${normalizeText(name)}`;
  if (text.includes('pin')) return 'PIN';
  if (text.includes('inverter') || text.includes('bien tan')) return 'INV';
  if (text.includes('day') || text.includes('cap')) return 'DAY';
  if (text.includes('tu dien') || text.includes('tu ac') || text.includes('tu dc')) return 'TD';
  if (text.includes('rail') || text.includes('khung')) return 'RAIL';
  if (text.includes('phu kien') || text.includes('kep') || text.includes('jack')) return 'PK';
  if (text.includes('dung cu') || text.includes('thiet bi thi cong')) return 'DC';
  if (text.includes('bao ve') || text.includes('cb') || text.includes('spd')) return 'TBV';
  return 'VT';
}

export function getDefaultMinStockForCategory(category?: string | null) {
  return getInventoryCategoryOption(category)?.defaultMinStock ?? 1;
}
