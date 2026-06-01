'use client';

import { CheckCircle2Icon, ClockIcon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  QUOTATION_STATUS_TRANSITIONS,
  type QuotationStatus,
} from '../schema/quotation.schema';
import { useUpdateQuotationStatus } from '../hooks/use-quotations';

type Props = {
  quotationId: string;
  status: QuotationStatus;
  canWrite: boolean;
  canApprove: boolean;
};

const ACTION_CONFIG: Partial<
  Record<
    QuotationStatus,
    { label: string; icon: React.ReactNode; variant: 'default' | 'outline' | 'destructive'; confirm?: string }
  >
> = {
  sent: {
    label: 'Đánh dấu đã gửi',
    icon: <CheckCircle2Icon className="size-3.5" />,
    variant: 'default',
  },
  accepted: {
    label: 'Chấp nhận',
    icon: <CheckCircle2Icon className="size-3.5" />,
    variant: 'default',
  },
  rejected: {
    label: 'Từ chối',
    icon: <XCircleIcon className="size-3.5" />,
    variant: 'destructive',
    confirm: 'Xác nhận từ chối báo giá này?',
  },
  expired: {
    label: 'Đánh dấu hết hạn',
    icon: <ClockIcon className="size-3.5" />,
    variant: 'outline',
    confirm: 'Đánh dấu báo giá này là hết hạn?',
  },
};

export function QuotationStatusSelect({ quotationId, status, canWrite, canApprove }: Props) {
  const updateStatus = useUpdateQuotationStatus(quotationId);

  const allowedTargets = QUOTATION_STATUS_TRANSITIONS[status] ?? [];
  if (allowedTargets.length === 0) return null;

  const handleTransition = async (target: QuotationStatus) => {
    const config = ACTION_CONFIG[target];
    if (config?.confirm && !window.confirm(config.confirm)) return;

    const result = await updateStatus.mutateAsync({ status: target });
    if (!result.success) alert(result.error);
  };

  // Determine which targets this user can action
  const visibleTargets = allowedTargets.filter((target) => {
    const isApproveAction = (['accepted', 'rejected', 'expired'] as QuotationStatus[]).includes(
      target,
    );
    return isApproveAction ? canApprove : canWrite;
  });

  if (visibleTargets.length === 0) return null;

  const showSentHelper = status === 'draft' && visibleTargets.includes('sent');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {visibleTargets.map((target) => {
          const config = ACTION_CONFIG[target];
          if (!config) return null;
          return (
            <Button
              key={target}
              variant={config.variant}
              size="sm"
              onClick={() => handleTransition(target)}
              disabled={updateStatus.isPending}
            >
              {config.icon}
              {config.label}
            </Button>
          );
        })}
      </div>
      {showSentHelper && (
        <p className="text-xs text-muted-foreground">
          Hãy xuất/tải báo giá và gửi cho khách bên ngoài hệ thống, sau đó đánh dấu đã gửi.
        </p>
      )}
    </div>
  );
}
