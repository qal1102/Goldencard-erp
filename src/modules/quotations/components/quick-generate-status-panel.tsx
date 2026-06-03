'use client';

import Link from 'next/link';
import type { QuickGenerateStatus } from '../lib/generate-quotation-items';

type Props = {
  status: QuickGenerateStatus;
  surveyId: string;
};

function StatusRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}

export function QuickGenerateStatusPanel({ status, surveyId }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium">Nguồn dữ liệu kỹ thuật</p>
      <StatusRow label="Công suất hệ thống" value={status.systemKw} />
      <StatusRow label="Số tấm pin" value={status.panelQuantity} />
      <StatusRow label="Công suất tấm pin" value={status.panelWattageW} />
      <StatusRow label="Số inverter" value={status.inverterQuantity} />
      <StatusRow label="Số khu vực/mái" value={status.zoneCount} />

      {!status.canGenerate && status.reason && (
        <p className="text-xs text-destructive">{status.reason}</p>
      )}

      {!status.canGenerate && status.missingFields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Thiếu: {status.missingFields.join(', ')}
        </p>
      )}

      {!status.canGenerate && (
        <Link
          href={`/surveys/${surveyId}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Cập nhật phiếu khảo sát
        </Link>
      )}
    </div>
  );
}
