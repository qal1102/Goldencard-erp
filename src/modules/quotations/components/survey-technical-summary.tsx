'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  INSTALLATION_DIFFICULTY_LABELS,
  POWER_PHASE_LABELS,
  SYSTEM_TYPE_LABELS,
  type InstallationDifficulty,
  type PowerPhase,
  type SystemType,
} from '@/modules/surveys/schema/survey.schema';
import type { SurveyTechnicalSource } from '../lib/generate-quotation-items';
import { hasSurveyTechnicalData } from '../lib/generate-quotation-items';

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

export function SurveyTechnicalSummary({ survey }: Props) {
  if (!hasSurveyTechnicalData(survey)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Thông tin kỹ thuật từ khảo sát</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
          value={
            survey.inverterQuantity != null ? `${survey.inverterQuantity} bộ` : null
          }
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
      </CardContent>
    </Card>
  );
}
