'use client';

import {
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  GitBranchPlusIcon,
  MessageSquareIcon,
  SendIcon,
  XCircleIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { QuotationDetail } from '../lib/quotation.queries';
import {
  QUOTATION_SENT_CHANNELS,
  QUOTATION_STATUS_LABELS,
  REVISION_SOURCE_STATUSES,
  type QuotationResponseStatus,
  type QuotationSentChannel,
  type QuotationStatus,
} from '../schema/quotation.schema';
import {
  useCreateQuotationRevision,
  useDownloadQuotationExcel,
  useMarkQuotationSent,
  useRecordQuotationResponse,
} from '../hooks/use-quotation-workflow';

const SENT_CHANNEL_LABELS: Record<QuotationSentChannel, string> = {
  zalo: 'Zalo',
  email: 'Email',
  print: 'In giấy',
  other: 'Khác',
};

const RESPONSE_ACTIONS: {
  status: QuotationResponseStatus;
  label: string;
  variant: 'default' | 'outline' | 'destructive';
  icon: ReactNode;
  confirm?: string;
}[] = [
  {
    status: 'accepted',
    label: 'Khách đồng ý',
    variant: 'default',
    icon: <CheckCircle2Icon className="size-3.5" />,
  },
  {
    status: 'rejected',
    label: 'Khách từ chối',
    variant: 'destructive',
    icon: <XCircleIcon className="size-3.5" />,
    confirm: 'Xác nhận khách từ chối báo giá này?',
  },
  {
    status: 'needs_revision',
    label: 'Cần chỉnh báo giá',
    variant: 'outline',
    icon: <MessageSquareIcon className="size-3.5" />,
  },
  {
    status: 'no_response',
    label: 'Không phản hồi',
    variant: 'outline',
    icon: <ClockIcon className="size-3.5" />,
  },
  {
    status: 'expired',
    label: 'Hết hiệu lực',
    variant: 'outline',
    icon: <ClockIcon className="size-3.5" />,
    confirm: 'Xác nhận báo giá đã hết hiệu lực?',
  },
];

type Props = {
  quotation: NonNullable<QuotationDetail>;
  canWrite: boolean;
  canApprove: boolean;
};

export function QuotationWorkflowPanel({ quotation, canWrite, canApprove }: Props) {
  const status = quotation.status as QuotationStatus;
  const exportCount = quotation.exports?.length ?? 0;
  const needsResend = quotation.needsResend ?? false;
  const filename = `${quotation.code}_v${quotation.revisionNumber ?? 1}.xlsx`;

  const downloadExcel = useDownloadQuotationExcel(quotation.id, filename);
  const markSent = useMarkQuotationSent(quotation.id);
  const recordResponse = useRecordQuotationResponse(quotation.id);
  const createRevision = useCreateQuotationRevision(quotation.id);

  const [sentDialogOpen, setSentDialogOpen] = useState(false);
  const [sentChannel, setSentChannel] = useState<QuotationSentChannel | ''>('');
  const [sentNote, setSentNote] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [isResendDialog, setIsResendDialog] = useState(false);

  const showMarkSent = canWrite && status === 'draft' && exportCount >= 1;
  const showMarkResent = canWrite && status === 'sent' && needsResend;
  const showExportBeforeSentHint = canWrite && status === 'draft' && exportCount === 0;
  const showExportForSent = canWrite && status === 'sent';
  const showResponse = canApprove && status === 'sent' && !needsResend;
  const showRevision =
    canWrite &&
    REVISION_SOURCE_STATUSES.includes(
      status as (typeof REVISION_SOURCE_STATUSES)[number],
    );

  const handleMarkSent = async () => {
    if (!sentChannel) {
      alert('Vui lòng chọn kênh gửi');
      return;
    }
    const result = await markSent.mutateAsync({
      sentChannel,
      sentNote: sentNote.trim() || undefined,
    });
    if (!result.success) {
      alert(result.error);
      return;
    }
    setSentDialogOpen(false);
    setSentChannel('');
    setSentNote('');
  };

  const handleResponse = async (responseStatus: QuotationResponseStatus, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;

    const result = await recordResponse.mutateAsync({
      status: responseStatus,
      responseNote: responseNote.trim() || undefined,
    });
    if (!result.success) alert(result.error);
  };

  const handleCreateRevision = async () => {
    if (
      !window.confirm(
        'Tạo bản chỉnh sửa mới từ báo giá này? Bản hiện tại sẽ được giữ nguyên.',
      )
    ) {
      return;
    }
    const result = await createRevision.mutateAsync();
    if (!result.success) alert(result.error);
  };

  const isBusy =
    downloadExcel.isPending ||
    markSent.isPending ||
    recordResponse.isPending ||
    createRevision.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Xuất &amp; theo dõi gửi báo giá</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {needsResend && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Đã chỉnh sửa sau khi gửi — cần xuất và gửi lại bản mới cho khách.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (status === 'draft' || showExportForSent) && (
              <Button
                className="w-full sm:w-auto"
                size="sm"
                onClick={() => downloadExcel.mutate()}
                disabled={isBusy}
              >
                <DownloadIcon className="size-3.5" />
                Tải báo giá Excel
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Tải file báo giá để gửi thủ công cho khách qua Zalo/email/in giấy.
          </p>

          {exportCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Đã xuất {exportCount} lần
              {quotation.exports?.[0]?.exportedAt && (
                <>
                  {' '}
                  · Lần cuối:{' '}
                  {new Date(quotation.exports[0].exportedAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {quotation.exports[0].exportedByUser?.name &&
                    ` · ${quotation.exports[0].exportedByUser.name}`}
                </>
              )}
            </p>
          )}

          {showExportBeforeSentHint && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Cần tải/xuất báo giá trước khi đánh dấu đã gửi.
            </p>
          )}

          {showMarkSent && (
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                setIsResendDialog(false);
                setSentDialogOpen(true);
              }}
              disabled={isBusy}
            >
              <SendIcon className="size-3.5" />
              Đánh dấu đã gửi cho khách
            </Button>
          )}

          {showMarkResent && (
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                setIsResendDialog(true);
                setSentDialogOpen(true);
              }}
              disabled={isBusy}
            >
              <SendIcon className="size-3.5" />
              Đánh dấu đã gửi lại cho khách
            </Button>
          )}

          {showResponse && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <Label className="text-xs text-muted-foreground">
                Ghi nhận phản hồi khách
              </Label>
              <Textarea
                placeholder="Ghi chú phản hồi (tuỳ chọn)"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {RESPONSE_ACTIONS.map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleResponse(action.status, action.confirm)}
                    disabled={isBusy}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showRevision && (
            <div className="border-t pt-3">
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                onClick={handleCreateRevision}
                disabled={isBusy}
              >
                <GitBranchPlusIcon className="size-3.5" />
                Tạo bản chỉnh sửa mới
              </Button>
            </div>
          )}

          {status === 'sent' && quotation.sentAt && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              Đã gửi lúc{' '}
              {new Date(quotation.sentAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {quotation.sentChannel &&
                ` · ${SENT_CHANNEL_LABELS[quotation.sentChannel as QuotationSentChannel] ?? quotation.sentChannel}`}
              {quotation.sentByUser?.name && ` · ${quotation.sentByUser.name}`}
            </p>
          )}

          {(status === 'accepted' ||
            status === 'rejected' ||
            status === 'needs_revision' ||
            status === 'no_response' ||
            status === 'expired') &&
            quotation.respondedAt && (
              <p className="text-xs text-muted-foreground">
                {QUOTATION_STATUS_LABELS[status]} ·{' '}
                {new Date(quotation.respondedAt).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {quotation.respondedByUser?.name && ` · ${quotation.respondedByUser.name}`}
                {quotation.responseNote && (
                  <span className="mt-1 block">{quotation.responseNote}</span>
                )}
              </p>
            )}
        </CardContent>
      </Card>

      <Dialog
        open={sentDialogOpen}
        onOpenChange={(open) => {
          setSentDialogOpen(open);
          if (!open) {
            setIsResendDialog(false);
            setSentChannel('');
            setSentNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isResendDialog
                ? 'Đánh dấu đã gửi lại cho khách'
                : 'Đánh dấu đã gửi cho khách'}
            </DialogTitle>
            <DialogDescription>
              {isResendDialog
                ? 'Ghi nhận bạn đã gửi lại bản báo giá đã chỉnh sửa cho khách bên ngoài hệ thống.'
                : 'Ghi nhận bạn đã gửi file báo giá cho khách bên ngoài hệ thống.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sent-channel">Kênh gửi *</Label>
              <Select
                value={sentChannel}
                onValueChange={(v) => setSentChannel(v as QuotationSentChannel)}
              >
                <SelectTrigger id="sent-channel" className="w-full">
                  <SelectValue placeholder="Chọn kênh gửi" />
                </SelectTrigger>
                <SelectContent>
                  {QUOTATION_SENT_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {SENT_CHANNEL_LABELS[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sent-note">Ghi chú (tuỳ chọn)</Label>
              <Textarea
                id="sent-note"
                placeholder="VD: Đã gửi qua Zalo cho anh Tuấn"
                value={sentNote}
                onChange={(e) => setSentNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={markSent.isPending} />}>
              Huỷ
            </DialogClose>
            <Button onClick={handleMarkSent} disabled={markSent.isPending || !sentChannel}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
