'use client';

import type { SurveyAggregates } from '../lib/survey-aggregates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  aggregates: SurveyAggregates;
  inverterType?: string | null;
  inverterQuantity?: number | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function SurveyAggregationSummary({ aggregates, inverterType, inverterQuantity }: Props) {
  const hasData =
    aggregates.totalRecommendedSystemKw > 0 ||
    aggregates.totalPanelQuantity > 0 ||
    aggregates.totalUsableAreaM2 > 0;

  if (!hasData && aggregates.zoneCount === 0) return null;

  const hasInverter = Boolean(inverterType?.trim()) || (inverterQuantity != null && inverterQuantity > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tổng hợp dự án</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Tổng công suất"
            value={
              aggregates.totalRecommendedSystemKw > 0
                ? `${aggregates.totalRecommendedSystemKw.toLocaleString('vi-VN')} kWp`
                : '—'
            }
          />
          <Stat
            label="Tổng tấm pin"
            value={
              aggregates.totalPanelQuantity > 0
                ? `${aggregates.totalPanelQuantity.toLocaleString('vi-VN')} tấm`
                : '—'
            }
          />
          <Stat
            label="Tổng diện tích sử dụng"
            value={
              aggregates.totalUsableAreaM2 > 0
                ? `${aggregates.totalUsableAreaM2.toLocaleString('vi-VN')} m²`
                : '—'
            }
          />
          <Stat label="Số khu vực/mái" value={String(aggregates.zoneCount)} />
        </div>

        {hasInverter && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
            {inverterQuantity != null && inverterQuantity > 0 && (
              <Stat
                label="Tổng inverter"
                value={`${inverterQuantity.toLocaleString('vi-VN')} bộ`}
              />
            )}
            {inverterType?.trim() && (
              <Stat label="Loại inverter" value={inverterType.trim()} />
            )}
          </div>
        )}

        {(aggregates.hardDifficultyZoneCount > 0 ||
          aggregates.roofReinforcementZoneCount > 0 ||
          aggregates.longCableRouteZoneCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
            {aggregates.longCableRouteZoneCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {aggregates.longCableRouteZoneCount} khu đi dây xa
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
