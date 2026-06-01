import type { Survey, SurveyZone } from '@/db/schema';
import { resolveSurveyZones } from './survey-aggregates';
import type {
  GridVoltage,
  ProjectScale,
  ProjectType,
  RoofType,
  SurveyZoneInput,
  UpdateSurveyInput,
} from '../schema/survey.schema';

type SurveyWithRelations = Survey & {
  zones?: SurveyZone[];
  customer?: { id: string; code: string; fullName: string } | null;
  lead?: { id: string; code: string; fullName: string } | null;
};

function zoneToFormInput(zone: SurveyZone): SurveyZoneInput {
  return {
    zoneName: zone.zoneName,
    roofType: (zone.roofType as RoofType | null) ?? undefined,
    roofMaterial: zone.roofMaterial ?? '',
    usableAreaM2: zone.usableAreaM2 ?? '',
    roofOrientation: zone.roofOrientation ?? '',
    roofTiltDeg: zone.roofTiltDeg != null ? String(zone.roofTiltDeg) : '',
    shadingNotes: zone.shadingNotes ?? '',
    roofStructureCondition: zone.roofStructureCondition ?? '',
    needsRoofReinforcement: zone.needsRoofReinforcement ?? false,
    recommendedSystemKw: zone.recommendedSystemKw ?? '',
    panelWattageW: zone.panelWattageW != null ? String(zone.panelWattageW) : '550',
    recommendedPanelQuantity:
      zone.recommendedPanelQuantity != null ? String(zone.recommendedPanelQuantity) : '',
    inverterLocation: zone.inverterLocation ?? '',
    cableRouteDistanceM:
      zone.cableRouteDistanceM != null ? String(zone.cableRouteDistanceM) : '',
    cableRouteNotes: zone.cableRouteNotes ?? '',
    installationDifficulty:
      (zone.installationDifficulty as SurveyZoneInput['installationDifficulty']) ?? undefined,
    extraMaterialsNote: zone.extraMaterialsNote ?? '',
    installationPlanNote: zone.installationPlanNote ?? '',
  };
}

export function createEmptyZone(zoneName = 'Mái chính'): SurveyZoneInput {
  return {
    zoneName,
    panelWattageW: '550',
    needsRoofReinforcement: false,
  };
}

export function buildSurveyFormDefaults(survey: SurveyWithRelations): Partial<UpdateSurveyInput> {
  const zones = resolveSurveyZones(survey).map(zoneToFormInput);

  return {
    address: survey.address,
    province: survey.province ?? '',
    scheduledAt: survey.scheduledAt
      ? toDatetimeLocalValue(survey.scheduledAt)
      : '',
    projectType: (survey.projectType ?? 'residential') as ProjectType,
    projectScale: (survey.projectScale ?? 'single') as ProjectScale,
    zones,
    floors: survey.floors != null ? String(survey.floors) : '',
    meterCapacityA: survey.meterCapacityA != null ? String(survey.meterCapacityA) : '',
    gridVoltage: (survey.gridVoltage as GridVoltage | undefined) ?? undefined,
    siteNotes: survey.siteNotes ?? '',
    internalNotes: survey.internalNotes ?? '',
    photosNote: survey.photosNote ?? '',
    inverterType: survey.inverterType ?? '',
    inverterQuantity: survey.inverterQuantity != null ? String(survey.inverterQuantity) : '1',
    systemType: (survey.systemType as UpdateSurveyInput['systemType']) ?? undefined,
    powerPhase: (survey.powerPhase as UpdateSurveyInput['powerPhase']) ?? undefined,
    mainBreakerCapacityA:
      survey.mainBreakerCapacityA != null ? String(survey.mainBreakerCapacityA) : '',
    mainElectricalCabinetCondition: survey.mainElectricalCabinetCondition ?? '',
    needsElectricalCabinetUpgrade: survey.needsElectricalCabinetUpgrade ?? false,
    hasGrounding: survey.hasGrounding ?? false,
    plannedInverterArea: survey.plannedInverterArea ?? '',
    inverterAreaNearMainPower: survey.inverterAreaNearMainPower ?? false,
    inverterAreaDistanceToMainCabinetM:
      survey.inverterAreaDistanceToMainCabinetM != null
        ? String(survey.inverterAreaDistanceToMainCabinetM)
        : '',
    inverterAreaCleanDryVentilated: survey.inverterAreaCleanDryVentilated ?? false,
    inverterAreaHasShelter: survey.inverterAreaHasShelter ?? false,
    inverterAreaRiskNotes: survey.inverterAreaRiskNotes ?? '',
    needsInverterShelterOrRack: survey.needsInverterShelterOrRack ?? false,
    mainPowerConnectionPoint: survey.mainPowerConnectionPoint ?? '',
    mainCabinetLocation: survey.mainCabinetLocation ?? '',
    groundingLocation: survey.groundingLocation ?? '',
    mainCableRouteNotes: survey.mainCableRouteNotes ?? '',
    maintenanceAccessNotes: survey.maintenanceAccessNotes ?? '',
    fireSafetyNotes: survey.fireSafetyNotes ?? '',
    generalTechnicalRiskNotes: survey.generalTechnicalRiskNotes ?? '',
  };
}

function toDatetimeLocalValue(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
