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
import { useCreateSurvey, useTechnicianUsers } from '../hooks/use-surveys';
import { createSurveySchema } from '../schema/survey.schema';

type Props = {
  customer: {
    id: string;
    code: string;
    fullName: string;
    address: string;
    province?: string | null;
  };
  leadId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateSurveyDialog({ customer, leadId, open, onOpenChange }: Props) {
  const { data: technicians } = useTechnicianUsers();
  const createSurvey = useCreateSurvey();

  const [form, setForm] = useState({
    address: customer.address,
    province: customer.province ?? '',
    scheduledAt: '',
    assignedTo: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = createSurveySchema.safeParse({
      customerId: customer.id,
      leadId: leadId || undefined,
      address: form.address,
      province: form.province || undefined,
      scheduledAt: form.scheduledAt || undefined,
      assignedTo: form.assignedTo || null,
      notes: form.notes || undefined,
    });

    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!newErrors[key]) newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    const result = await createSurvey.mutateAsync(parsed.data);
    if (!result.success) {
      setServerError(result.error);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-4 pb-3">
          <DialogTitle>Tạo phiếu khảo sát</DialogTitle>
          <DialogDescription>
            Khảo sát cho khách hàng <strong>{customer.fullName}</strong> ({customer.code})
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-survey-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-4 pb-2"
        >
          {serverError && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{serverError}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-address">
              Địa chỉ khảo sát <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cs-address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-province">Tỉnh / Thành phố</Label>
            <Input
              id="cs-province"
              value={form.province}
              onChange={(e) => handleChange('province', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-scheduledAt">Ngày hẹn khảo sát</Label>
            <Input
              id="cs-scheduledAt"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-assignedTo">Phân công kỹ thuật viên</Label>
            <Select
              value={form.assignedTo}
              onValueChange={(v) => handleChange('assignedTo', v ?? '')}
            >
              <SelectTrigger id="cs-assignedTo" className="w-full">
                <SelectValue placeholder="Chưa phân công">
                  {(value) => {
                    const tech = technicians?.find((t) => t.id === value);
                    return tech ? tech.name : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Chưa phân công</SelectItem>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-notes">Ghi chú nội bộ</Label>
            <Textarea
              id="cs-notes"
              placeholder="Thông tin cần lưu ý cho kỹ thuật viên..."
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>
        </form>

        <DialogFooter className="shrink-0">
          <DialogClose render={<Button variant="outline" disabled={createSurvey.isPending} />}>
            Hủy
          </DialogClose>
          <Button form="create-survey-form" type="submit" disabled={createSurvey.isPending}>
            {createSurvey.isPending ? 'Đang tạo...' : 'Tạo phiếu khảo sát'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
