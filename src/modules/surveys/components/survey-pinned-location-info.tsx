'use client';

import { MapPinnedIcon } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import {
  buildSurveyMapsUrl,
  formatAccuracyMeters,
  formatCoordinatePair,
  hasPinnedCheckIn,
} from '@/lib/address/survey-location';

type Props = {
  latitude?: string | number | null;
  longitude?: string | number | null;
  accuracy?: string | number | null;
  checkedInAt?: Date | string | null;
  checkedInByName?: string | null;
  checkInNote?: string | null;
};

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SurveyPinnedLocationInfo({
  latitude,
  longitude,
  accuracy,
  checkedInAt,
  checkedInByName,
  checkInNote,
}: Props) {
  if (!hasPinnedCheckIn({ latitude, longitude })) return null;

  const coords = formatCoordinatePair(latitude, longitude);
  const mapUrl = buildSurveyMapsUrl({ latitude, longitude });
  const accuracyLabel = formatAccuracyMeters(accuracy);
  const checkedInLabel = formatDateTime(checkedInAt);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/25">
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
        <MapPinnedIcon className="size-3.5 shrink-0" />
        Đã ghim vị trí thực tế
      </p>
      {coords && (
        <div className="flex flex-col gap-0.5">
          <Label className="text-xs text-muted-foreground">Tọa độ GPS</Label>
          {mapUrl ? (
            <Link
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {coords}
            </Link>
          ) : (
            <span className="font-mono text-xs">{coords}</span>
          )}
        </div>
      )}
      {(checkedInByName || checkedInLabel || accuracyLabel) && (
        <p className="text-[10px] text-muted-foreground">
          {checkedInByName && <span>{checkedInByName}</span>}
          {checkedInByName && checkedInLabel && <span> · </span>}
          {checkedInLabel && <span>{checkedInLabel}</span>}
          {accuracyLabel && (
            <span>
              {(checkedInByName || checkedInLabel) && ' · '}
              {accuracyLabel}
            </span>
          )}
        </p>
      )}
      {checkInNote?.trim() && (
        <div className="flex flex-col gap-0.5">
          <Label className="text-xs text-muted-foreground">Ghi chú vị trí</Label>
          <span className="text-xs whitespace-pre-wrap">{checkInNote}</span>
        </div>
      )}
    </div>
  );
}
