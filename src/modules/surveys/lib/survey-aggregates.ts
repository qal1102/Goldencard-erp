import type { Survey, SurveyZone } from '@/db/schema';

export const LONG_CABLE_ROUTE_THRESHOLD_M = 50;

export type SurveyForZoneResolution = Survey & {
  zones?: SurveyZone[];
};

export type SurveyZoneAggregateInput = Pick<
  SurveyZone,
  | 'zoneName'
  | 'recommendedSystemKw'
  | 'panelWattageW'
  | 'recommendedPanelQuantity'
  | 'usableAreaM2'
  | 'cableRouteDistanceM'
  | 'installationDifficulty'
  | 'needsRoofReinforcement'
>;

export type SurveyAggregates = {
  totalRecommendedSystemKw: number;
  totalPanelQuantity: number;
  totalUsableAreaM2: number;
  zoneCount: number;
  hardDifficultyZoneCount: number;
  roofReinforcementZoneCount: number;
  longCableRouteZoneCount: number;
};

const LEGACY_DEFAULT_ZONE_NAME = 'Mái chính';

function parsePositiveNumber(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function zoneRecommendedSystemKw(zone: SurveyZoneAggregateInput): number {
  return parsePositiveNumber(zone.recommendedSystemKw);
}

export function resolveZonePanelQuantity(zone: SurveyZoneAggregateInput): number {
  if (zone.recommendedPanelQuantity != null && zone.recommendedPanelQuantity > 0) {
    return zone.recommendedPanelQuantity;
  }

  const kw = zoneRecommendedSystemKw(zone);
  const panelW = zone.panelWattageW ?? 550;
  if (kw > 0 && panelW > 0) {
    return Math.ceil((kw * 1000) / panelW);
  }

  return 0;
}

function zoneUsableAreaM2(zone: SurveyZoneAggregateInput): number {
  return parsePositiveNumber(zone.usableAreaM2);
}

function synthesizeLegacyZone(survey: Survey): SurveyZone {
  const now = survey.updatedAt ?? survey.createdAt;

  return {
    id: `legacy-${survey.id}`,
    surveyId: survey.id,
    sortOrder: 0,
    zoneName: LEGACY_DEFAULT_ZONE_NAME,
    roofType: survey.roofType,
    roofMaterial: survey.roofMaterial,
    usableAreaM2: survey.roofAreaM2,
    roofOrientation: survey.roofOrientation,
    roofTiltDeg: survey.roofTiltDeg,
    shadingNotes: survey.shadingNotes,
    roofStructureCondition: survey.roofStructureCondition,
    needsRoofReinforcement: survey.needsRoofReinforcement ?? false,
    recommendedSystemKw: survey.recommendedSystemKw,
    panelWattageW: survey.panelWattageW ?? 550,
    recommendedPanelQuantity: survey.recommendedPanelQuantity,
    inverterLocation: survey.inverterLocation,
    cableRouteDistanceM: survey.cableRouteDistanceM,
    cableRouteNotes: null,
    installationDifficulty: survey.installationDifficulty,
    extraMaterialsNote: survey.extraMaterialsNote,
    installationPlanNote: survey.installationPlanNote,
    createdAt: now,
    updatedAt: now,
  };
}

/** Returns DB zones when present; otherwise one synthesized zone from legacy flat fields. */
export function resolveSurveyZones(survey: SurveyForZoneResolution): SurveyZone[] {
  if (survey.zones && survey.zones.length > 0) {
    return survey.zones;
  }

  return [synthesizeLegacyZone(survey)];
}

export function isValidSurveyZoneForCompletion(
  zone: Pick<SurveyZone, 'zoneName' | 'recommendedSystemKw' | 'usableAreaM2'>,
): boolean {
  if (!zone.zoneName?.trim()) return false;
  return parsePositiveNumber(zone.recommendedSystemKw) > 0 || parsePositiveNumber(zone.usableAreaM2) > 0;
}

export function hasValidSurveyZonesForCompletion(
  zones: Pick<SurveyZone, 'zoneName' | 'recommendedSystemKw' | 'usableAreaM2'>[],
): boolean {
  return zones.some(isValidSurveyZoneForCompletion);
}

export function computeSurveyAggregates(zones: SurveyZoneAggregateInput[]): SurveyAggregates {
  let totalRecommendedSystemKw = 0;
  let totalPanelQuantity = 0;
  let totalUsableAreaM2 = 0;
  let hardDifficultyZoneCount = 0;
  let roofReinforcementZoneCount = 0;
  let longCableRouteZoneCount = 0;

  for (const zone of zones) {
    totalRecommendedSystemKw += zoneRecommendedSystemKw(zone);
    totalPanelQuantity += resolveZonePanelQuantity(zone);
    totalUsableAreaM2 += zoneUsableAreaM2(zone);

    if (zone.installationDifficulty === 'hard') {
      hardDifficultyZoneCount += 1;
    }

    if (zone.needsRoofReinforcement) {
      roofReinforcementZoneCount += 1;
    }

    if (
      zone.cableRouteDistanceM != null &&
      zone.cableRouteDistanceM > LONG_CABLE_ROUTE_THRESHOLD_M
    ) {
      longCableRouteZoneCount += 1;
    }
  }

  return {
    totalRecommendedSystemKw,
    totalPanelQuantity,
    totalUsableAreaM2,
    zoneCount: zones.length,
    hardDifficultyZoneCount,
    roofReinforcementZoneCount,
    longCableRouteZoneCount,
  };
}
