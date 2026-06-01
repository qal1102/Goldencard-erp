'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SurveyZoneBreakdownTable } from '@/modules/surveys/components/survey-zone-breakdown-table';
import {
  INSTALLATION_DIFFICULTY_LABELS,
  POWER_PHASE_LABELS,
  PROJECT_SCALE_LABELS,
  PROJECT_TYPE_LABELS,
  SYSTEM_TYPE_LABELS,
  type InstallationDifficulty,
  type PowerPhase,
  type ProjectScale,
  type ProjectType,
  type SystemType,
} from '@/modules/surveys/schema/survey.schema';
import { computeSurveyAggregates } from '@/modules/surveys/lib/survey-aggregates';
import type { SurveyTechnicalSource } from '../lib/generate-quotation-items';
import {
  hasSurveyTechnicalData,
  isMultiZoneSurveyTechnical,
} from '../lib/generate-quotation-items';

type Props = {
  survey: SurveyTechnicalSource;
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function formatBool(value: boolean | null | undefined, yesLabel: string, noLabel: string) {
  if (value === null || value === undefined) return null;
  return value ? yesLabel : noLabel;
}

function LegacyTechnicalSummary({ survey }: Props) {
  return (
    <>
      <DetailRow
        label="Công suất đề xuất"
        value={survey.recommendedSystemKw ? `${survey.recommendedSystemKw} kWp` : null}
      />
      <DetailRow
        label="Công suất tấm pin"
        value={survey.panelWattageW ? `${survey.panelWattageW} W/tấm` : null}
      />
      <DetailRow
        label="Số lượng tấm đề xuất"
        value={
          survey.recommendedPanelQuantity != null
            ? `${survey.recommendedPanelQuantity} tấm`
            : null
        }
      />
      <DetailRow label="Loại inverter" value={survey.inverterType} />
      <DetailRow
        label="Số lượng inverter"
        value={survey.inverterQuantity != null ? `${survey.inverterQuantity} bộ` : null}
      />
      <DetailRow
        label="Loại hệ thống"
        value={
          survey.systemType
            ? (SYSTEM_TYPE_LABELS[survey.systemType as SystemType] ?? survey.systemType)
            : null
        }
      />
      <DetailRow
        label="Hệ điện"
        value={
          survey.powerPhase
            ? (POWER_PHASE_LABELS[survey.powerPhase as PowerPhase] ?? survey.powerPhase)
            : null
        }
      />
      <DetailRow
        label="Độ khó thi công"
        value={
          survey.installationDifficulty
            ? (INSTALLATION_DIFFICULTY_LABELS[
                survey.installationDifficulty as InstallationDifficulty
              ] ?? survey.installationDifficulty)
            : null
        }
      />
      <DetailRow
        label="Cần gia cố mái?"
        value={formatBool(survey.needsRoofReinforcement, 'Có', 'Không')}
      />
      <DetailRow
        label="Cần nâng cấp tủ điện?"
        value={formatBool(survey.needsElectricalCabinetUpgrade, 'Có', 'Không')}
      />
      <DetailRow
        label="Có tiếp địa?"
        value={formatBool(survey.hasGrounding, 'Có', 'Không')}
      />
      <DetailRow label="Ghi chú vật tư phát sinh" value={survey.extraMaterialsNote} />
      <DetailRow label="Ghi chú phương án lắp đặt" value={survey.installationPlanNote} />
    </>
  );
}

function MultiZoneTechnicalSummary({ survey }: Props) {
  const resolvedZones = survey.zones ?? [];
  const aggregates = computeSurveyAggregates(resolvedZones);
  const projectType = (survey.projectType ?? 'residential') as ProjectType;
  const projectScale = (survey.projectScale ?? 'multi') as ProjectScale;

  return (
    <>
      <DetailRow label="Loại công trình" value={PROJECT_TYPE_LABELS[projectType]} />
      <DetailRow label="Quy mô khảo sát" value={PROJECT_SCALE_LABELS[projectScale]} />
      <DetailRow
        label="Tổng công suất"
        value={
          aggregates.totalRecommendedSystemKw > 0
            ? `${aggregates.totalRecommendedSystemKw.toLocaleString('vi-VN')} kWp`
            : null
        }
      />
      <DetailRow
        label="Tổng tấm pin"
        value={
          aggregates.totalPanelQuantity > 0
            ? `${aggregates.totalPanelQuantity.toLocaleString('vi-VN')} tấm`
            : null
        }
      />
      <DetailRow
        label="Tổng diện tích"
        value={
          aggregates.totalUsableAreaM2 > 0
            ? `${aggregates.totalUsableAreaM2.toLocaleString('vi-VN')} m²`
            : null
        }
      />
      <DetailRow label="Số khu vực/mái" value={String(aggregates.zoneCount)} />
      <DetailRow label="Loại inverter" value={survey.inverterType} />
      <DetailRow
        label="Số lượng inverter"
        value={survey.inverterQuantity != null ? `${survey.inverterQuantity} bộ` : null}
      />
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Chi tiết theo khu vực</Label>
        <SurveyZoneBreakdownTable zones={resolvedZones} />
      </div>
      <DetailRow
        label="Loại hệ thống"
        value={
          survey.systemType
            ? (SYSTEM_TYPE_LABELS[survey.systemType as SystemType] ?? survey.systemType)
            : null
        }
      />
      <DetailRow
        label="Hệ điện"
        value={
          survey.powerPhase
            ? (POWER_PHASE_LABELS[survey.powerPhase as PowerPhase] ?? survey.powerPhase)
            : null
        }
      />
      <DetailRow
        label="Cần nâng cấp tủ điện?"
        value={formatBool(survey.needsElectricalCabinetUpgrade, 'Có', 'Không')}
      />
      <DetailRow
        label="Có tiếp địa?"
        value={formatBool(survey.hasGrounding, 'Có', 'Không')}
      />
      {(aggregates.hardDifficultyZoneCount > 0 ||
        aggregates.roofReinforcementZoneCount > 0) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {aggregates.hardDifficultyZoneCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {aggregates.hardDifficultyZoneCount} khu thi công khó
            </span>
          )}
          {aggregates.roofReinforcementZoneCount > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
              {aggregates.roofReinforcementZoneCount} khu cần gia cố mái
            </span>
          )}
        </div>
      )}
      <DetailRow label="Ghi chú vật tư phát sinh" value={survey.extraMaterialsNote} />
      <DetailRow label="Ghi chú phương án lắp đặt" value={survey.installationPlanNote} />
    </>
  );
}

export function SurveyTechnicalSummary({ survey }: Props) {
  if (!hasSurveyTechnicalData(survey)) return null;

  const isMultiZone = isMultiZoneSurveyTechnical(survey);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Thông tin kỹ thuật từ khảo sát</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isMultiZone ? (
          <MultiZoneTechnicalSummary survey={survey} />
        ) : (
          <LegacyTechnicalSummary survey={survey} />
        )}
      </CardContent>
    </Card>
  );
}
