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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from '../schema/lead.schema';
import { getLeadStatusLabel } from '../lib/lead-labels';

type Props = {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus, lostReason?: string) => Promise<void>;
  disabled?: boolean;
};

export function LeadStatusSelect({ currentStatus, onStatusChange, disabled }: Props) {
  const [pending, setPending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [lostReasonError, setLostReasonError] = useState('');

  const handleSelect = (value: string | null) => {
    if (!value) return;
    const status = value as LeadStatus;
    if (status === currentStatus) return;
    setSelectedStatus(status);
    setLostReason('');
    setLostReasonError('');
  };

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    if (selectedStatus === 'lost' && lostReason.trim().length < 5) {
      setLostReasonError('Vui lòng nhập lý do ít nhất 5 ký tự');
      return;
    }

    setPending(true);
    try {
      await onStatusChange(selectedStatus, selectedStatus === 'lost' ? lostReason : undefined);
      setSelectedStatus(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Select value={currentStatus} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>{(value) => getLeadStatusLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={Boolean(selectedStatus)} onOpenChange={(open) => !open && setSelectedStatus(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái</DialogTitle>
            <DialogDescription>
              Chuyển sang:{' '}
              <strong>{selectedStatus ? LEAD_STATUS_LABELS[selectedStatus] : ''}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedStatus === 'lost' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lost-reason">
                Lý do không tiến hành <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="lost-reason"
                placeholder="Nhập lý do..."
                value={lostReason}
                onChange={(e) => {
                  setLostReason(e.target.value);
                  setLostReasonError('');
                }}
                rows={3}
                aria-invalid={Boolean(lostReasonError)}
              />
              {lostReasonError && (
                <p className="text-xs text-destructive">{lostReasonError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pending} />}>
              Hủy
            </DialogClose>
            <Button onClick={handleConfirm} disabled={pending}>
              {pending ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
