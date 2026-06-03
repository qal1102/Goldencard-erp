import type { Survey } from '@/db/schema';
import {
  resolveSurveyZones,
  type SurveyForZoneResolution,
  type SurveyZoneAggregateInput,
} from './survey-aggregates';

export type SurveyForCompletionCheck = SurveyForZoneResolution &
  Pick<Survey, 'status' | 'scheduledAt' | 'projectScale' | 'panelWattageW'>;

export type SurveyCompletionRequirements = {
  canComplete: boolean;
  missingReasons: string[];
  warnings: string[];
};

type ZoneCheckOptions = {
  surveyPanelWattageW?: number | null;
  useZonePrefix: boolean;
};

function parsePositiveNumber(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function zoneLabel(zone: Pick<SurveyZoneAggregateInput, 'zoneName'>): string {
  return zone.zoneName?.trim() || 'Khu vực chưa đặt tên';
}

function hasExplicitPanelQuantity(zone: SurveyZoneAggregateInput): boolean {
  return zone.recommendedPanelQuantity != null && zone.recommendedPanelQuantity > 0;
}

function resolveEffectivePanelWattageW(
  zone: SurveyZoneAggregateInput,
  surveyPanelWattageW?: number | null,
): number | null {
  if (zone.panelWattageW != null && zone.panelWattageW > 0) return zone.panelWattageW;
  if (surveyPanelWattageW != null && surveyPanelWattageW > 0) return surveyPanelWattageW;
  return null;
}

function formatMissingSizing(label: string, useZonePrefix: boolean): string {
  if (useZonePrefix) return `${label}: chưa có công suất đề xuất hoặc số tấm pin.`;
  return 'Chưa có công suất đề xuất hoặc số tấm pin.';
}

function formatMissingPanelWForKw(label: string, useZonePrefix: boolean): string {
  if (useZonePrefix) {
    return `${label}: đã có công suất đề xuất nhưng thiếu công suất tấm pin để tính số tấm.`;
  }
  return 'Đã có công suất đề xuất nhưng thiếu công suất tấm pin để tính số tấm.';
}

/** Per-zone sizing gaps — area alone does not satisfy completion. */
export function getZoneCompletionMissingReasons(
  zone: SurveyZoneAggregateInput,
  options: ZoneCheckOptions,
): string[] {
  const { surveyPanelWattageW, useZonePrefix } = options;
  const label = zoneLabel(zone);

  if (!zone.zoneName?.trim()) {
    return useZonePrefix
      ? [`${label}: thiếu tên khu vực`]
      : ['Thiếu tên khu vực khảo sát'];
  }

  const kw = parsePositiveNumber(zone.recommendedSystemKw);
  const hasPanels = hasExplicitPanelQuantity(zone);

  if (kw <= 0 && !hasPanels) {
    return [formatMissingSizing(label, useZonePrefix)];
  }

  if (kw > 0 && !hasPanels) {
    const panelW = resolveEffectivePanelWattageW(zone, surveyPanelWattageW);
    if (!panelW || panelW <= 0) {
      return [formatMissingPanelWForKw(label, useZonePrefix)];
    }
  }

  return [];
}

function isMultiZoneSurvey(survey: SurveyForCompletionCheck, zoneCount: number): boolean {
  const hasDbZones = Boolean(survey.zones && survey.zones.length > 0);
  if (!hasDbZones) return false;
  return survey.projectScale === 'multi' || zoneCount > 1;
}

export function getSurveyCompletionRequirements(
  survey: SurveyForCompletionCheck,
  options: { requireAssignedStatus?: boolean } = {},
): SurveyCompletionRequirements {
  const { requireAssignedStatus = true } = options;
  const missingReasons: string[] = [];
  const warnings: string[] = [];

  if (requireAssignedStatus && survey.status !== 'assigned') {
    missingReasons.push('Phiếu phải ở trạng thái đã phân công mới có thể hoàn thành');
  }

  if (survey.scheduledAt) {
    const scheduled = new Date(survey.scheduledAt);
    if (!Number.isNaN(scheduled.getTime()) && scheduled.getTime() > Date.now()) {
      warnings.push(
        'Ngày hẹn khảo sát đang ở tương lai, vui lòng kiểm tra lại trước khi hoàn thành.',
      );
    }
  }

  const zones = resolveSurveyZones(survey);
  const multi = isMultiZoneSurvey(survey, zones.length);
  const zoneCheckOpts: ZoneCheckOptions = {
    surveyPanelWattageW: survey.panelWattageW,
    useZonePrefix: multi,
  };

  if (zones.length === 0) {
    missingReasons.push('Chưa có dữ liệu khu vực khảo sát');
  } else {
    for (const zone of zones) {
      missingReasons.push(...getZoneCompletionMissingReasons(zone, zoneCheckOpts));
    }
  }

  const uniqueMissing = [...new Set(missingReasons)];

  return {
    canComplete: uniqueMissing.length === 0,
    missingReasons: uniqueMissing,
    warnings,
  };
}

export function formatSurveyCompletionBlockedMessage(
  requirements: SurveyCompletionRequirements,
): string {
  if (requirements.missingReasons.length === 0) {
    return 'Không thể hoàn thành phiếu khảo sát';
  }
  const bullets = requirements.missingReasons.map((r) => `• ${r}`).join('\n');
  return `Không thể hoàn thành khảo sát. Cần bổ sung trước khi hoàn thành:\n${bullets}`;
}

/** True when survey has technical gaps (ignores assigned-status gate). */
export function surveyHasTechnicalCompletionGaps(
  survey: SurveyForCompletionCheck,
): boolean {
  const { missingReasons } = getSurveyCompletionRequirements(survey, {
    requireAssignedStatus: false,
  });
  return missingReasons.length > 0;
}
