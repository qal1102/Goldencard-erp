'use client';

import { ChevronDownIcon } from 'lucide-react';
import type { SurveyZone } from '@/db/schema';
import { Label } from '@/components/ui/label';
import { resolveZonePanelQuantity } from '../lib/survey-aggregates';
import {
  INSTALLATION_DIFFICULTY_LABELS,
  ROOF_TYPE_LABELS,
  type InstallationDifficulty,
  type RoofType,
} from '../schema/survey.schema';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{String(value)}</span>
    </div>
  );
}

function buildZoneHeaderSubtitle(zone: SurveyZone): string {
  const parts: string[] = [];
  const kw = zone.recommendedSystemKw ? parseFloat(zone.recommendedSystemKw) : 0;
  const panelQty = resolveZonePanelQuantity(zone);
  const area = zone.usableAreaM2 ? parseFloat(zone.usableAreaM2) : 0;

  if (kw > 0) parts.push(`${zone.recommendedSystemKw} kWp`);
  if (panelQty > 0) parts.push(`${panelQty} tấm`);
  if (area > 0) parts.push(`${zone.usableAreaM2} m²`);

  return parts.length > 0 ? parts.join(' · ') : 'Chưa có dữ liệu kỹ thuật';
}

type Props = {
  zone: SurveyZone;
  index: number;
  defaultOpen?: boolean;
  isLegacy?: boolean;
};

export function SurveyZoneReadCard({ zone, defaultOpen = false, isLegacy }: Props) {
  const panelQty = resolveZonePanelQuantity(zone);
  const panelWattage = zone.panelWattageW ?? 550;
  const difficultyLabel = zone.installationDifficulty
    ? (INSTALLATION_DIFFICULTY_LABELS[zone.installationDifficulty as InstallationDifficulty] ??
      zone.installationDifficulty)
    : null;

  return (
    <details className="group rounded-lg border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {zone.zoneName} — {buildZoneHeaderSubtitle(zone)}
          </p>
          {difficultyLabel && (
            <p className="text-xs text-muted-foreground">Độ khó: {difficultyLabel}</p>
          )}
        </div>
        {isLegacy && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Dữ liệu cũ
          </span>
        )}
      </summary>
      <div className="flex flex-col gap-3 border-t px-4 py-3">
        <DetailRow
          label="Công suất đề xuất"
          value={zone.recommendedSystemKw ? `${zone.recommendedSystemKw} kWp` : null}
        />
        <DetailRow
          label="Số tấm pin"
          value={panelQty > 0 ? `${panelQty} tấm` : null}
        />
        <DetailRow label="Công suất tấm pin" value={panelWattage > 0 ? `${panelWattage} W` : null} />
        <DetailRow
          label="Diện tích sử dụng"
          value={zone.usableAreaM2 ? `${zone.usableAreaM2} m²` : null}
        />
        <DetailRow
          label="Loại mái"
          value={
            zone.roofType
              ? zone.roofType === 'other' && zone.roofMaterial
                ? `${ROOF_TYPE_LABELS[zone.roofType as RoofType] ?? zone.roofType} - ${zone.roofMaterial}`
                : (ROOF_TYPE_LABELS[zone.roofType as RoofType] ?? zone.roofType)
              : null
          }
        />
        <DetailRow label="Vật liệu mái" value={zone.roofMaterial} />
        <DetailRow label="Hướng mái" value={zone.roofOrientation} />
        <DetailRow
          label="Độ nghiêng"
          value={zone.roofTiltDeg != null ? `${zone.roofTiltDeg}°` : null}
        />
        <DetailRow label="Bóng che" value={zone.shadingNotes} />
        <DetailRow
          label="Khoảng cách đi dây"
          value={zone.cableRouteDistanceM != null ? `${zone.cableRouteDistanceM} m` : null}
        />
        <DetailRow label="Vị trí inverter khu vực" value={zone.inverterLocation} />
        <DetailRow label="Độ khó thi công" value={difficultyLabel} />
        <DetailRow label="Ghi chú vật tư phát sinh cho báo giá" value={zone.extraMaterialsNote} />
        {zone.installationPlanNote && (
          <DetailRow label="Gợi ý phương án lắp đặt" value={zone.installationPlanNote} />
        )}
        {zone.roofStructureCondition && (
          <DetailRow label="Kết cấu mái" value={zone.roofStructureCondition} />
        )}
        {zone.needsRoofReinforcement != null && (
          <DetailRow
            label="Gia cố mái"
            value={zone.needsRoofReinforcement ? 'Cần gia cố' : 'Không cần'}
          />
        )}
        {zone.cableRouteNotes && (
          <DetailRow label="Ghi chú đi dây" value={zone.cableRouteNotes} />
        )}
      </div>
    </details>
  );
}
