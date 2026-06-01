'use client';

import type { SurveyZone } from '@/db/schema';
import {
  INSTALLATION_DIFFICULTY_LABELS,
  type InstallationDifficulty,
} from '../schema/survey.schema';
import { resolveZonePanelQuantity } from '../lib/survey-aggregates';

type Props = {
  zones: SurveyZone[];
};

function formatKw(kw: string | null | undefined): string {
  const n = kw ? parseFloat(kw) : 0;
  return n > 0 ? `${kw} kWp` : '—';
}

function formatArea(area: string | null | undefined): string {
  const n = area ? parseFloat(area) : 0;
  return n > 0 ? `${area} m²` : '—';
}

export function SurveyZoneBreakdownTable({ zones }: Props) {
  if (zones.length <= 1) return null;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Khu vực/Mái</th>
            <th className="px-3 py-2 font-medium">Công suất</th>
            <th className="px-3 py-2 font-medium">Số tấm</th>
            <th className="px-3 py-2 font-medium">Diện tích</th>
            <th className="px-3 py-2 font-medium">Độ khó</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => {
            const panelQty = resolveZonePanelQuantity(zone);
            const difficulty = zone.installationDifficulty
              ? (INSTALLATION_DIFFICULTY_LABELS[
                  zone.installationDifficulty as InstallationDifficulty
                ] ?? zone.installationDifficulty)
              : '—';

            return (
              <tr key={zone.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 font-medium">{zone.zoneName}</td>
                <td className="px-3 py-2">{formatKw(zone.recommendedSystemKw)}</td>
                <td className="px-3 py-2">{panelQty > 0 ? panelQty : '—'}</td>
                <td className="px-3 py-2">{formatArea(zone.usableAreaM2)}</td>
                <td className="px-3 py-2">{difficulty}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
