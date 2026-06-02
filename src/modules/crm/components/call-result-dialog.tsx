'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitCallResult } from '../hooks/use-leads';
import { getCallResultLabel } from '../lib/lead-labels';
import {
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  type CallResult,
  submitCallResultSchema,
} from '../schema/lead.schema';

type Props = {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultConsultation?: {
    consultationNote?: string | null;
    customerRequirements?: string | null;
    followUpAt?: Date | string | null;
  };
};

function toDatetimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CallResultDialog({
  leadId,
  open,
  onOpenChange,
  defaultConsultation,
}: Props) {
  const submit = useSubmitCallResult(leadId);
  const [callResult, setCallResult] = useState<CallResult | ''>('');
  const [note, setNote] = useState(defaultConsultation?.consultationNote ?? '');
  const [customerRequirements, setCustomerRequirements] = useState(
    defaultConsultation?.customerRequirements ?? '',
  );
  const [followUpAt, setFollowUpAt] = useState(
    toDatetimeLocalValue(defaultConsultation?.followUpAt),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const resetForm = () => {
    setCallResult('');
    setNote(defaultConsultation?.consultationNote ?? '');
    setCustomerRequirements(defaultConsultation?.customerRequirements ?? '');
    setFollowUpAt(toDatetimeLocalValue(defaultConsultation?.followUpAt));
    setErrors({});
    setServerError('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const parsed = submitCallResultSchema.safeParse({
      callResult: callResult || undefined,
      note: note || undefined,
      customerRequirements: customerRequirements || undefined,
      followUpAt: followUpAt || undefined,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      if (!callResult) nextErrors.callResult = 'Vui lòng chọn kết quả cuộc gọi';
      setErrors(nextErrors);
      return;
    }

    const result = await submit.mutateAsync(parsed.data);
    if (result.success) {
      handleOpenChange(false);
    } else {
      setServerError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi kết quả cuộc gọi</DialogTitle>
          <DialogDescription>
            Hệ thống chỉ ghi nhận thao tác và nội dung bạn nhập — không xác minh cuộc gọi thực tế.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="callResult">Kết quả cuộc gọi</Label>
            <Select
              value={callResult}
              onValueChange={(v) => {
                setCallResult(v as CallResult);
                setErrors((prev) => ({ ...prev, callResult: '' }));
              }}
            >
              <SelectTrigger id="callResult" aria-invalid={Boolean(errors.callResult)}>
                <SelectValue placeholder="Chọn kết quả...">
                  {(value) => getCallResultLabel(value) || 'Chọn kết quả...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CALL_RESULTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CALL_RESULT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.callResult && (
              <p className="text-xs text-destructive">{errors.callResult}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="callNote">Ghi chú tư vấn</Label>
            <Textarea
              id="callNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Nội dung trao đổi với khách..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerRequirements">Nhu cầu khách hàng</Label>
            <Textarea
              id="customerRequirements"
              value={customerRequirements}
              onChange={(e) => setCustomerRequirements(e.target.value)}
              rows={3}
              placeholder="Công suất, loại hệ thống, yêu cầu đặc biệt..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followUpAt">Hẹn liên hệ lại (tuỳ chọn)</Label>
            <Input
              id="followUpAt"
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
            />
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Bỏ qua
            </DialogClose>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Đang lưu...' : 'Lưu kết quả'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
