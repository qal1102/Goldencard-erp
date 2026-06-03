'use client';

import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { PROJECT_MODULE_CONFIG } from '../modules';
import type { ProjectProgressView, ProjectRecordRef } from '../types';

function formatVndFromDetail(detail: string | null | undefined): string | null {
  if (!detail) return null;
  const match = detail.match(/·\s*([\d.,]+)$/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function RecordBlock({ record, showTitle = true }: { record: ProjectRecordRef; showTitle?: boolean }) {
  const config = PROJECT_MODULE_CONFIG[record.module];
  const amount = record.module === 'quotation' ? formatVndFromDetail(record.detail) : null;
  const needsResend = Boolean(record.meta?.needsResend);

  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
      {showTitle && (
        <span className="text-xs text-muted-foreground">
          {config.shortCode}: {record.title}
        </span>
      )}
      <Link href={record.href} className="font-mono text-sm text-primary hover:underline">
        {record.code}
        {record.detail && record.module === 'quotation' ? ` · ${record.detail.split(' · ')[0]}` : ''}
      </Link>
      <span className="text-xs text-muted-foreground">
        {record.statusLabel}
        {amount && (
          <>
            {' · '}
            <span className="tabular-nums font-medium text-foreground">{amount}</span>
          </>
        )}
      </span>
      {needsResend && (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Cần gửi lại cho khách
        </span>
      )}
    </div>
  );
}

type Props = {
  progress: ProjectProgressView;
  /** compact = pipeline card strip; full = detail body; chain = linked records only */
  variant?: 'compact' | 'full' | 'chain';
};

/**
 * Module-agnostic progress UI — works for any anchor once context is composed.
 */
export function ProjectProgressPanel({ progress, variant = 'full' }: Props) {
  const isCompact = variant === 'compact';
  const isChainOnly = variant === 'chain';
  const chainModules = ['survey', 'quotation', 'contract', 'work_order'] as const;
  const chainRecords = chainModules
    .map((m) => progress.records[m])
    .filter((r): r is ProjectRecordRef => Boolean(r));

  if (isCompact) {
    return (
      <div className="mt-2 space-y-1 border-t border-foreground/5 pt-2">
        <p className="text-xs font-semibold leading-snug text-foreground">
          {progress.currentStageLabel}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Tiếp theo: {progress.nextAction}
        </p>
        {progress.responsible?.name && (
          <p className="text-[11px] text-muted-foreground">
            {progress.responsible.roleLabel ?? 'Phụ trách'}: {progress.responsible.name}
          </p>
        )}
        {chainRecords.map((record) => (
          <p key={record.module} className="text-[11px] text-muted-foreground">
            {PROJECT_MODULE_CONFIG[record.module].shortCode}:{' '}
            <Link
              href={record.href}
              className="font-mono text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {record.code}
            </Link>
            {' · '}
            {record.statusLabel}
            {record.module === 'quotation' && record.detail && (
              <>
                {' · '}
                <span className="tabular-nums">
                  {formatVndFromDetail(record.detail) ?? record.detail}
                </span>
              </>
            )}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!isChainOnly && (
        <>
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs text-muted-foreground">Chi tiết giai đoạn</Label>
            <span className="text-sm font-medium">{progress.currentStageLabel}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs text-muted-foreground">Việc cần làm tiếp</Label>
            <span className="text-sm">{progress.nextAction}</span>
          </div>
        </>
      )}
      {progress.responsible?.name && (
        <div className="flex flex-col gap-0.5">
          <Label className="text-xs text-muted-foreground">
            {progress.responsible.roleLabel ?? 'Phụ trách'}
          </Label>
          <span className="text-sm">{progress.responsible.name}</span>
        </div>
      )}
      {chainRecords.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Liên kết dự án</Label>
          {chainRecords.map((record) => (
            <RecordBlock key={record.module} record={record} />
          ))}
        </div>
      )}
      {progress.downstream.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Tiếp theo trên pipeline:{' '}
          {progress.downstream.map((r) => PROJECT_MODULE_CONFIG[r.module].title).join(' → ')}
        </p>
      )}
    </div>
  );
}
