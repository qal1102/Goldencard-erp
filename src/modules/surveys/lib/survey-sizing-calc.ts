export function calcPanelQuantityFromKw(kw: number, panelWattageW: number): number {
  return Math.ceil((kw * 1000) / panelWattageW);
}

export function calcEstimatedKwFromPanels(panelQuantity: number, panelWattageW: number): number {
  return (panelQuantity * panelWattageW) / 1000;
}

export function parsePositiveFloat(value: string | null | undefined): number {
  if (value == null || value.trim() === '') return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function parsePositiveInt(value: string | null | undefined, fallback = 0): number {
  if (value == null || value.trim() === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
