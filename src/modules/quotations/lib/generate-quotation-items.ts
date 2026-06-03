import type { Survey, SurveyZone } from '@/db/schema';
import {
  computeSurveyAggregates,
  resolveZonePanelQuantity,
  type SurveyAggregates,
  type SurveyForZoneResolution,
  type SurveyZoneAggregateInput,
} from '@/modules/surveys/lib/survey-aggregates';
import type {
  InstallationDifficulty,
  PowerPhase,
  ProjectScale,
  ProjectType,
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
  projectType: string | null;
  projectScale: string | null;
  /** Legacy flat roof area (single-zone surveys without DB zones). */
  roofAreaM2?: string | null;
  /** Persisted survey_zones rows; when absent, legacy flat fields are used. */
  zones?: SurveyZone[];
};

export type SurveyTechnicalForQuotation = {
  recommendedSystemKw: number;
  panelWattageW: number;
  recommendedPanelQuantity: number;
  totalUsableAreaM2: number;
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
  projectType: ProjectType | null;
  projectScale: ProjectScale | null;
  isMultiZone: boolean;
  zoneBreakdownText: string | null;
  aggregates: SurveyAggregates | null;
  resolvedZones: SurveyZone[];
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

export type SurveyForQuotationTechnical = SurveyForZoneResolution &
  Pick<
    Survey,
    | 'recommendedSystemKw'
    | 'panelWattageW'
    | 'recommendedPanelQuantity'
    | 'inverterType'
    | 'inverterQuantity'
    | 'systemType'
    | 'powerPhase'
    | 'needsRoofReinforcement'
    | 'needsElectricalCabinetUpgrade'
    | 'hasGrounding'
    | 'installationDifficulty'
    | 'extraMaterialsNote'
    | 'installationPlanNote'
    | 'projectType'
    | 'projectScale'
    | 'roofAreaM2'
  >;

export function buildSurveyTechnicalSource(
  survey: SurveyForQuotationTechnical,
): SurveyTechnicalSource {
  return {
    recommendedSystemKw: survey.recommendedSystemKw,
    panelWattageW: survey.panelWattageW,
    recommendedPanelQuantity: survey.recommendedPanelQuantity,
    inverterType: survey.inverterType,
    inverterQuantity: survey.inverterQuantity,
    systemType: survey.systemType,
    powerPhase: survey.powerPhase,
    needsRoofReinforcement: survey.needsRoofReinforcement,
    needsElectricalCabinetUpgrade: survey.needsElectricalCabinetUpgrade,
    hasGrounding: survey.hasGrounding,
    installationDifficulty: survey.installationDifficulty,
    extraMaterialsNote: survey.extraMaterialsNote,
    installationPlanNote: survey.installationPlanNote,
    projectType: survey.projectType,
    projectScale: survey.projectScale,
    roofAreaM2: survey.roofAreaM2,
    zones: survey.zones,
  };
}

function parsePositiveNumber(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function zoneRecommendedSystemKw(zone: SurveyZoneAggregateInput): number {
  return parsePositiveNumber(zone.recommendedSystemKw);
}

export function formatZoneBreakdownText(
  zones: SurveyZoneAggregateInput[],
  aggregates: SurveyAggregates,
): string {
  const lines = zones.map((zone) => {
    const kw = zoneRecommendedSystemKw(zone);
    const panels = resolveZonePanelQuantity(zone);
    const area = parsePositiveNumber(zone.usableAreaM2);
    const parts = [
      `${zone.zoneName}: ${kw > 0 ? kw : '—'} kWp`,
      `${panels > 0 ? panels : '—'} tấm`,
    ];
    if (area > 0) {
      parts.push(`${area} m²`);
    }
    return parts.join(' · ');
  });

  const totalKw =
    aggregates.totalRecommendedSystemKw > 0
      ? String(aggregates.totalRecommendedSystemKw)
      : '—';
  const totalPanels =
    aggregates.totalPanelQuantity > 0 ? String(aggregates.totalPanelQuantity) : '—';
  lines.push(`Tổng: ${totalKw} kWp · ${totalPanels} tấm`);

  return lines.join('\n');
}

function appendZoneBreakdown(description: string, zoneBreakdownText: string | null): string {
  if (!zoneBreakdownText) return description;
  return description ? `${description}\n${zoneBreakdownText}` : zoneBreakdownText;
}

function appendUsableAreaNote(description: string, totalUsableAreaM2: number): string {
  if (totalUsableAreaM2 <= 0) return description;
  const note = `Tổng diện tích sử dụng: ${totalUsableAreaM2} m²`;
  return description ? `${description}\n${note}` : note;
}

export function hasSurveyTechnicalData(survey: SurveyTechnicalSource): boolean {
  if (survey.zones && survey.zones.length > 0) {
    const aggregates = computeSurveyAggregates(survey.zones);
    return (
      aggregates.totalRecommendedSystemKw > 0 ||
      aggregates.totalPanelQuantity > 0 ||
      aggregates.totalUsableAreaM2 > 0
    );
  }

  return Boolean(
    survey.recommendedSystemKw ||
      survey.recommendedPanelQuantity ||
      survey.panelWattageW ||
      survey.inverterType ||
      survey.systemType ||
      survey.installationDifficulty,
  );
}

export function isMultiZoneSurveyTechnical(survey: SurveyTechnicalSource): boolean {
  return (survey.zones?.length ?? 0) > 1;
}

export function parseSurveyTechnicalForQuotation(
  survey: SurveyTechnicalSource,
): SurveyTechnicalForQuotation | null {
  const hasDbZones = Boolean(survey.zones && survey.zones.length > 0);

  if (hasDbZones) {
    const resolvedZones = survey.zones!;
    const aggregates = computeSurveyAggregates(resolvedZones);

    if (aggregates.totalRecommendedSystemKw <= 0 && aggregates.totalPanelQuantity <= 0) {
      return null;
    }

    const firstZone = resolvedZones[0];
    const panelW = firstZone?.panelWattageW ?? survey.panelWattageW ?? 550;
    const systemKw =
      aggregates.totalRecommendedSystemKw > 0
        ? aggregates.totalRecommendedSystemKw
        : (aggregates.totalPanelQuantity * panelW) / 1000;
    const panelQty =
      aggregates.totalPanelQuantity > 0
        ? aggregates.totalPanelQuantity
        : Math.ceil((systemKw * 1000) / panelW);

    if (!systemKw || systemKw <= 0 || !panelQty || panelQty <= 0) {
      return null;
    }

    const isMultiZone = resolvedZones.length > 1;
    const installationDifficulty: InstallationDifficulty | null =
      aggregates.hardDifficultyZoneCount > 0
        ? 'hard'
        : ((survey.installationDifficulty as InstallationDifficulty | null) ?? null);

    return {
      recommendedSystemKw: systemKw,
      panelWattageW: panelW,
      recommendedPanelQuantity: panelQty,
      totalUsableAreaM2: aggregates.totalUsableAreaM2,
      inverterType: survey.inverterType ?? '',
      inverterQuantity: survey.inverterQuantity ?? 1,
      systemType: (survey.systemType as SystemType | null) ?? null,
      powerPhase: (survey.powerPhase as PowerPhase | null) ?? null,
      needsRoofReinforcement:
        aggregates.roofReinforcementZoneCount > 0 || (survey.needsRoofReinforcement ?? false),
      needsElectricalCabinetUpgrade: survey.needsElectricalCabinetUpgrade ?? false,
      hasGrounding: survey.hasGrounding ?? false,
      installationDifficulty,
      extraMaterialsNote: survey.extraMaterialsNote,
      installationPlanNote: survey.installationPlanNote,
      projectType: (survey.projectType as ProjectType | null) ?? null,
      projectScale: (survey.projectScale as ProjectScale | null) ?? null,
      isMultiZone,
      zoneBreakdownText: isMultiZone
        ? formatZoneBreakdownText(resolvedZones, aggregates)
        : null,
      aggregates,
      resolvedZones,
    };
  }

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

  const totalUsableAreaM2 = parsePositiveNumber(survey.roofAreaM2);

  return {
    recommendedSystemKw: systemKw,
    panelWattageW: panelW,
    recommendedPanelQuantity: panelQty,
    totalUsableAreaM2,
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
    projectType: (survey.projectType as ProjectType | null) ?? null,
    projectScale: (survey.projectScale as ProjectScale | null) ?? null,
    isMultiZone: false,
    zoneBreakdownText: null,
    aggregates: null,
    resolvedZones: [],
  };
}

export type QuickGenerateStatus = {
  canGenerate: boolean;
  reason: string | null;
  systemKw: string | null;
  panelQuantity: string | null;
  panelWattageW: string | null;
  inverterQuantity: string | null;
  zoneCount: string | null;
  missingFields: string[];
};

function hasPanelWattageOnly(survey: SurveyTechnicalSource): boolean {
  const zones = survey.zones ?? [];
  const hasPanelW =
    (survey.panelWattageW ?? 0) > 0 || zones.some((zone) => (zone.panelWattageW ?? 0) > 0);
  if (!hasPanelW) return false;

  if (zones.length > 0) {
    const aggregates = computeSurveyAggregates(zones);
    return aggregates.totalRecommendedSystemKw <= 0 && aggregates.totalPanelQuantity <= 0;
  }

  const hasKw = parsePositiveNumber(survey.recommendedSystemKw) > 0;
  const hasQty = (survey.recommendedPanelQuantity ?? 0) > 0;
  return !hasKw && !hasQty;
}

export function getQuickGenerateStatus(survey: SurveyTechnicalSource): QuickGenerateStatus {
  const parsed = parseSurveyTechnicalForQuotation(survey);
  const zones = survey.zones ?? [];
  const aggregates = zones.length > 0 ? computeSurveyAggregates(zones) : null;

  const systemKw =
    parsed != null
      ? `${parsed.recommendedSystemKw} kWp`
      : aggregates && aggregates.totalRecommendedSystemKw > 0
        ? `${aggregates.totalRecommendedSystemKw} kWp`
        : survey.recommendedSystemKw
          ? `${survey.recommendedSystemKw} kWp`
          : null;

  const panelQuantity =
    parsed != null
      ? `${parsed.recommendedPanelQuantity} tấm`
      : aggregates && aggregates.totalPanelQuantity > 0
        ? `${aggregates.totalPanelQuantity} tấm`
        : survey.recommendedPanelQuantity != null && survey.recommendedPanelQuantity > 0
          ? `${survey.recommendedPanelQuantity} tấm`
          : null;

  const panelW =
    parsed?.panelWattageW ??
    zones[0]?.panelWattageW ??
    survey.panelWattageW ??
    null;
  const panelWattageW = panelW != null && panelW > 0 ? `${panelW} W` : null;

  const inverterQuantity =
    survey.inverterQuantity != null && survey.inverterQuantity > 0
      ? `${survey.inverterQuantity} bộ`
      : null;

  const zoneCount =
    aggregates != null
      ? `${aggregates.zoneCount} khu`
      : zones.length > 0
        ? `${zones.length} khu`
        : null;

  const missingFields: string[] = [];
  if (!systemKw && !panelQuantity) {
    missingFields.push('Công suất hệ thống hoặc số tấm pin');
  }
  if (!panelWattageW) {
    missingFields.push('Công suất tấm pin');
  }

  if (parsed) {
    return {
      canGenerate: true,
      reason: null,
      systemKw,
      panelQuantity,
      panelWattageW,
      inverterQuantity,
      zoneCount,
      missingFields: [],
    };
  }

  const zonesMissingSizing = zones.filter(
    (zone) =>
      zoneRecommendedSystemKw(zone) <= 0 && resolveZonePanelQuantity(zone) <= 0,
  );

  let reason: string;
  if (hasPanelWattageOnly(survey)) {
    reason =
      'Đã có công suất tấm pin nhưng chưa có công suất hệ thống hoặc số tấm pin.';
  } else if (zones.length > 1 && zonesMissingSizing.length > 0) {
    reason =
      'Một hoặc nhiều khu vực/mái chưa có công suất đề xuất hoặc số tấm pin.';
  } else {
    reason = 'Chưa có công suất đề xuất hoặc số tấm pin trong phiếu khảo sát.';
  }

  return {
    canGenerate: false,
    reason,
    systemKw,
    panelQuantity,
    panelWattageW,
    inverterQuantity,
    zoneCount,
    missingFields,
  };
}

export function generateQuotationItemsFromSurvey(
  tech: SurveyTechnicalForQuotation,
): GeneratedQuotationItem[] {
  const prices = QUOTATION_ITEM_DEFAULT_PRICES;
  const inverterLabel = tech.inverterType.trim()
    ? `Inverter / Bộ hòa lưới ${tech.inverterType}`
    : 'Inverter / Bộ hòa lưới';

  const zoneNote = tech.zoneBreakdownText;
  const panelDescription = appendZoneBreakdown('Thiết bị chính', zoneNote);

  let railDescription = 'Khung & mái';
  railDescription = appendUsableAreaNote(railDescription, tech.totalUsableAreaM2);
  railDescription = appendZoneBreakdown(railDescription, zoneNote);

  let laborDescription = 'Thi công';
  laborDescription = appendZoneBreakdown(laborDescription, zoneNote);

  const items: GeneratedQuotationItem[] = [
    // Group 1 — Thiết bị chính
    {
      productName: `Tấm pin năng lượng mặt trời ${tech.panelWattageW}W`,
      description: panelDescription,
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
      description: railDescription,
      quantity: tech.recommendedSystemKw,
      unit: 'kWp',
      unitPrice: prices.railPerKwp,
    },
    {
      productName: 'Phụ kiện chống thấm / chống dột',
      description: tech.needsRoofReinforcement
        ? 'Khung & mái — khảo sát ghi nhận cần gia cố mái'
        : appendUsableAreaNote('Khung & mái', tech.totalUsableAreaM2),
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
      description: laborDescription,
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
