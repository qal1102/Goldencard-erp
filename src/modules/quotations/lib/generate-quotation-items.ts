import type {
  InstallationDifficulty,
  PowerPhase,
  SystemType,
} from '@/modules/surveys/schema/survey.schema';

export type SurveyTechnicalSource = {
  recommendedSystemKw: string | null;
  panelWattageW: number | null;
  recommendedPanelQuantity: number | null;
  inverterType: string | null;
  inverterQuantity: number | null;
  systemType: string | null;
  powerPhase: string | null;
  needsRoofReinforcement: boolean | null;
  needsElectricalCabinetUpgrade: boolean | null;
  hasGrounding: boolean | null;
  installationDifficulty: string | null;
  extraMaterialsNote: string | null;
  installationPlanNote: string | null;
};

export type SurveyTechnicalForQuotation = {
  recommendedSystemKw: number;
  panelWattageW: number;
  recommendedPanelQuantity: number;
  inverterType: string;
  inverterQuantity: number;
  systemType: SystemType | null;
  powerPhase: PowerPhase | null;
  needsRoofReinforcement: boolean;
  needsElectricalCabinetUpgrade: boolean;
  hasGrounding: boolean;
  installationDifficulty: InstallationDifficulty | null;
  extraMaterialsNote: string | null;
  installationPlanNote: string | null;
};

export type GeneratedQuotationItem = {
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

/** Temporary MVP default prices — will be replaced by Product/SKU catalog later. */
export const QUOTATION_ITEM_DEFAULT_PRICES = {
  panelPerUnit: 2_500_000,
  inverterPerSet: 15_000_000,
  railPerKwp: 1_500_000,
  waterproofPackage: 2_000_000,
  dcCableSet: 3_000_000,
  dcProtectionSet: 1_500_000,
  acCableSet: 2_500_000,
  acCabinetSet: 5_000_000,
  groundingSet: 2_000_000,
  laborPerKwp: 3_000_000,
  transportPackage: 1_500_000,
  difficultInstallPackage: 5_000_000,
} as const;

export function hasSurveyTechnicalData(survey: SurveyTechnicalSource): boolean {
  return Boolean(
    survey.recommendedSystemKw ||
      survey.recommendedPanelQuantity ||
      survey.panelWattageW ||
      survey.inverterType ||
      survey.systemType ||
      survey.installationDifficulty,
  );
}

export function parseSurveyTechnicalForQuotation(
  survey: SurveyTechnicalSource,
): SurveyTechnicalForQuotation | null {
  const panelW = survey.panelWattageW ?? 550;
  const parsedKw = survey.recommendedSystemKw
    ? parseFloat(survey.recommendedSystemKw)
    : NaN;
  let systemKw = Number.isFinite(parsedKw) && parsedKw > 0 ? parsedKw : null;
  let panelQty =
    survey.recommendedPanelQuantity != null && survey.recommendedPanelQuantity > 0
      ? survey.recommendedPanelQuantity
      : null;

  if (!systemKw && panelQty) {
    systemKw = (panelQty * panelW) / 1000;
  }
  if (!panelQty && systemKw) {
    panelQty = Math.ceil((systemKw * 1000) / panelW);
  }

  if (!systemKw || systemKw <= 0 || !panelQty || panelQty <= 0) {
    return null;
  }

  return {
    recommendedSystemKw: systemKw,
    panelWattageW: panelW,
    recommendedPanelQuantity: panelQty,
    inverterType: survey.inverterType ?? '',
    inverterQuantity: survey.inverterQuantity ?? 1,
    systemType: (survey.systemType as SystemType | null) ?? null,
    powerPhase: (survey.powerPhase as PowerPhase | null) ?? null,
    needsRoofReinforcement: survey.needsRoofReinforcement ?? false,
    needsElectricalCabinetUpgrade: survey.needsElectricalCabinetUpgrade ?? false,
    hasGrounding: survey.hasGrounding ?? false,
    installationDifficulty:
      (survey.installationDifficulty as InstallationDifficulty | null) ?? null,
    extraMaterialsNote: survey.extraMaterialsNote,
    installationPlanNote: survey.installationPlanNote,
  };
}

export function generateQuotationItemsFromSurvey(
  tech: SurveyTechnicalForQuotation,
): GeneratedQuotationItem[] {
  const prices = QUOTATION_ITEM_DEFAULT_PRICES;
  const inverterLabel = tech.inverterType.trim()
    ? `Inverter ${tech.inverterType}`
    : 'Inverter';

  const items: GeneratedQuotationItem[] = [
    // Group 1 — Thiết bị chính
    {
      productName: `Tấm pin năng lượng mặt trời ${tech.panelWattageW}W`,
      description: 'Thiết bị chính',
      quantity: tech.recommendedPanelQuantity,
      unit: 'tấm',
      unitPrice: prices.panelPerUnit,
    },
    {
      productName: inverterLabel,
      description: tech.inverterType ? 'Thiết bị chính' : 'Thiết bị chính — chưa ghi loại trên khảo sát',
      quantity: tech.inverterQuantity,
      unit: 'bộ',
      unitPrice: prices.inverterPerSet,
    },
    // Group 2 — Khung & mái
    {
      productName: 'Hệ khung rail & phụ kiện mái',
      description: 'Khung & mái',
      quantity: tech.recommendedSystemKw,
      unit: 'kWp',
      unitPrice: prices.railPerKwp,
    },
    {
      productName: 'Phụ kiện chống thấm / chống dột',
      description: tech.needsRoofReinforcement
        ? 'Khung & mái — khảo sát ghi nhận cần gia cố mái'
        : 'Khung & mái',
      quantity: 1,
      unit: 'gói',
      unitPrice: prices.waterproofPackage,
    },
    // Group 3 — Vật tư DC
    {
      productName: 'Dây DC & đầu nối MC4',
      description: 'Vật tư DC',
      quantity: 1,
      unit: 'bộ',
      unitPrice: prices.dcCableSet,
    },
    {
      productName: 'Thiết bị bảo vệ DC',
      description: 'Vật tư DC',
      quantity: 1,
      unit: 'bộ',
      unitPrice: prices.dcProtectionSet,
    },
    // Group 4 — Vật tư AC
    {
      productName: 'Dây AC & phụ kiện đấu nối',
      description: 'Vật tư AC',
      quantity: 1,
      unit: 'bộ',
      unitPrice: prices.acCableSet,
    },
    {
      productName: 'Tủ điện, CB, thiết bị bảo vệ AC',
      description: tech.needsElectricalCabinetUpgrade
        ? 'Vật tư AC — khảo sát ghi nhận cần nâng cấp tủ điện'
        : 'Vật tư AC',
      quantity: 1,
      unit: 'bộ',
      unitPrice: prices.acCabinetSet,
    },
    // Group 5 — An toàn & tiếp địa
    {
      productName: 'Chống sét & tiếp địa hệ thống',
      description: tech.hasGrounding
        ? 'An toàn & tiếp địa — khảo sát ghi nhận có tiếp địa'
        : 'An toàn & tiếp địa',
      quantity: 1,
      unit: 'bộ',
      unitPrice: prices.groundingSet,
    },
    // Group 6 — Thi công
    {
      productName: 'Nhân công lắp đặt',
      description: 'Thi công',
      quantity: tech.recommendedSystemKw,
      unit: 'kWp',
      unitPrice: prices.laborPerKwp,
    },
    {
      productName: 'Vận chuyển vật tư',
      description: 'Thi công',
      quantity: 1,
      unit: 'gói',
      unitPrice: prices.transportPackage,
    },
  ];

  if (tech.installationDifficulty === 'hard') {
    items.push({
      productName: 'Chi phí phát sinh / thi công khó',
      description: 'Thi công — độ khó: Khó',
      quantity: 1,
      unit: 'gói',
      unitPrice: prices.difficultInstallPackage,
    });
  }

  return items;
}
