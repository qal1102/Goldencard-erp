'use client';

import type { Survey } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

function boolLabel(value: boolean | null | undefined): string | null {
  if (value == null) return null;
  return value ? 'Có' : 'Không';
}

type Props = {
  survey: Survey;
};

export function SurveyInfrastructureReadCard({ survey }: Props) {
  const hasData =
    survey.plannedInverterArea ||
    survey.inverterAreaNearMainPower ||
    survey.inverterAreaDistanceToMainCabinetM ||
    survey.inverterAreaCleanDryVentilated ||
    survey.inverterAreaHasShelter ||
    survey.inverterAreaRiskNotes ||
    survey.needsInverterShelterOrRack ||
    survey.mainPowerConnectionPoint ||
    survey.mainCabinetLocation ||
    survey.groundingLocation ||
    survey.mainCableRouteNotes ||
    survey.maintenanceAccessNotes ||
    survey.fireSafetyNotes ||
    survey.generalTechnicalRiskNotes ||
    survey.mainBreakerCapacityA ||
    survey.mainElectricalCabinetCondition ||
    survey.needsElectricalCabinetUpgrade != null ||
    survey.hasGrounding != null;

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Hạ tầng điện &amp; inverter (toàn dự án)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DetailRow label="Khu vực lắp inverter" value={survey.plannedInverterArea} />
        <DetailRow
          label="Gần nguồn điện chính"
          value={boolLabel(survey.inverterAreaNearMainPower)}
        />
        <DetailRow
          label="Khoảng cách đến tủ điện chính"
          value={
            survey.inverterAreaDistanceToMainCabinetM != null
              ? `${survey.inverterAreaDistanceToMainCabinetM} m`
              : null
          }
        />
        <DetailRow
          label="Khu vực khô ráo, thoáng"
          value={boolLabel(survey.inverterAreaCleanDryVentilated)}
        />
        <DetailRow label="Có mái che" value={boolLabel(survey.inverterAreaHasShelter)} />
        <DetailRow label="Rủi ro khu inverter" value={survey.inverterAreaRiskNotes} />
        <DetailRow
          label="Cần mái che / giá đỡ inverter"
          value={boolLabel(survey.needsInverterShelterOrRack)}
        />
        <DetailRow label="Điểm nối nguồn chính" value={survey.mainPowerConnectionPoint} />
        <DetailRow label="Vị trí tủ điện chính" value={survey.mainCabinetLocation} />
        <DetailRow
          label="CB chính"
          value={
            survey.mainBreakerCapacityA != null ? `${survey.mainBreakerCapacityA} A` : null
          }
        />
        <DetailRow label="Tình trạng tủ điện" value={survey.mainElectricalCabinetCondition} />
        <DetailRow
          label="Nâng cấp tủ điện"
          value={boolLabel(survey.needsElectricalCabinetUpgrade ?? undefined)}
        />
        <DetailRow label="Vị trí tiếp địa" value={survey.groundingLocation} />
        <DetailRow label="Tiếp địa" value={boolLabel(survey.hasGrounding ?? undefined)} />
        <DetailRow label="Tuyến cáp chính" value={survey.mainCableRouteNotes} />
        <DetailRow label="Lối bảo trì" value={survey.maintenanceAccessNotes} />
        <DetailRow label="PCCC" value={survey.fireSafetyNotes} />
        <DetailRow label="Rủi ro kỹ thuật chung" value={survey.generalTechnicalRiskNotes} />
      </CardContent>
    </Card>
  );
}
