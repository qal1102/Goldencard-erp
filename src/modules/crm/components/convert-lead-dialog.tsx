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
import { Textarea } from '@/components/ui/textarea';
import type { Lead } from '@/db/schema';
import { useConvertLeadToCustomer } from '../hooks/use-customers';
import { convertLeadSchema } from '../schema/customer.schema';

type Props = {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customerCode: string) => void;
};

export function ConvertLeadDialog({ lead, open, onOpenChange, onSuccess }: Props) {
  const isReferral = lead.source === 'referral';

  const [form, setForm] = useState({
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email ?? '',
    address: lead.address,
    province: lead.province ?? '',
    notes: lead.notes ?? '',
    referrerName: lead.referrerName ?? '',
    referrerPhone: lead.referrerPhone ?? '',
    referralNote: lead.referralNote ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const convert = useConvertLeadToCustomer(lead.id);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = convertLeadSchema.safeParse({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address,
      province: form.province || undefined,
      notes: form.notes || undefined,
      referrerName: form.referrerName || undefined,
      referrerPhone: form.referrerPhone || undefined,
      referralNote: form.referralNote || undefined,
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

    const result = await convert.mutateAsync(parsed.data);
    if (result.success) {
      onSuccess(result.data.customerCode);
      onOpenChange(false);
    } else {
      setServerError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-4 pb-3">
          <DialogTitle>Chuyển thành Khách hàng</DialogTitle>
          <DialogDescription>
            Xem lại thông tin trước khi tạo hồ sơ khách hàng từ cơ hội{' '}
            <strong>{lead.code}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form
          id="convert-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-4 pb-2"
        >
          {serverError && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{serverError}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-fullName">
              Họ tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cvt-fullName"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-phone">
              Số điện thoại <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cvt-phone"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-email">Email</Label>
            <Input
              id="cvt-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-address">
              Địa chỉ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cvt-address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-province">Tỉnh/TP</Label>
            <Input
              id="cvt-province"
              value={form.province}
              onChange={(e) => handleChange('province', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cvt-notes">Ghi chú</Label>
            <Textarea
              id="cvt-notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {isReferral && (
            <div className="rounded-lg border border-dashed p-3 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Thông tin giới thiệu</p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cvt-referrerName">Người giới thiệu</Label>
                <Input
                  id="cvt-referrerName"
                  value={form.referrerName}
                  onChange={(e) => handleChange('referrerName', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cvt-referrerPhone">SĐT người giới thiệu</Label>
                <Input
                  id="cvt-referrerPhone"
                  value={form.referrerPhone}
                  onChange={(e) => handleChange('referrerPhone', e.target.value)}
                  inputMode="numeric"
                  aria-invalid={Boolean(errors.referrerPhone)}
                />
                {errors.referrerPhone && (
                  <p className="text-xs text-destructive">{errors.referrerPhone}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cvt-referralNote">Ghi chú giới thiệu</Label>
                <Textarea
                  id="cvt-referralNote"
                  value={form.referralNote}
                  onChange={(e) => handleChange('referralNote', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="shrink-0">
          <DialogClose render={<Button variant="outline" disabled={convert.isPending} />}>
            Hủy
          </DialogClose>
          <Button form="convert-form" type="submit" disabled={convert.isPending}>
            {convert.isPending ? 'Đang tạo...' : 'Xác nhận chuyển đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
