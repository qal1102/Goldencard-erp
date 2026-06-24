'use client';

import { useState } from 'react';
import { AddressInputFields } from '@/components/address/address-input-fields';
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
import { Textarea } from '@/components/ui/textarea';
import { updateAddressSchema } from '@/lib/address/address.schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  addressFieldLabel: string;
  address: string;
  province?: string | null;
  requireEditNote?: boolean;
  quotationWarning?: boolean;
  isPending?: boolean;
  onSubmit: (data: { address: string; province?: string; editNote?: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
};

export function EditAddressDialog({
  open,
  onOpenChange,
  title,
  description,
  addressFieldLabel,
  address: initialAddress,
  province: initialProvince,
  requireEditNote = false,
  quotationWarning = false,
  isPending = false,
  onSubmit,
}: Props) {
  const [address, setAddress] = useState(initialAddress);
  const [province, setProvince] = useState(initialProvince ?? '');
  const [editNote, setEditNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const resetForm = () => {
    setAddress(initialAddress);
    setProvince(initialProvince ?? '');
    setEditNote('');
    setErrors({});
    setServerError('');
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const parsed = updateAddressSchema.safeParse({
      address: address.trim(),
      province: province.trim() || undefined,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    if (requireEditNote && editNote.trim().length < 5) {
      setErrors({ editNote: 'Cần ghi chú lý do chỉnh sửa (ít nhất 5 ký tự)' });
      return;
    }

    const result = await onSubmit({
      address: parsed.data.address,
      province: parsed.data.province,
      editNote: requireEditNote ? editNote.trim() : undefined,
    });

    if (result.success) {
      handleOpenChange(false);
    } else {
      setServerError(result.error ?? 'Lỗi hệ thống');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {quotationWarning && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Thay đổi địa chỉ khảo sát có thể ảnh hưởng báo giá / kế hoạch thi công.
            </p>
          )}

          <AddressInputFields
            idPrefix="edit"
            address={address}
            province={province}
            onAddressChange={(value) => {
              setAddress(value);
              setErrors((prev) => ({ ...prev, address: '' }));
            }}
            onProvinceChange={setProvince}
            addressLabel={addressFieldLabel}
            required
            addressError={errors.address}
          />

          {requireEditNote && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-note">
                Lý do chỉnh sửa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-note"
                value={editNote}
                onChange={(e) => {
                  setEditNote(e.target.value);
                  setErrors((prev) => ({ ...prev, editNote: '' }));
                }}
                rows={2}
                placeholder="Mô tả lý do thay đổi địa chỉ..."
                aria-invalid={Boolean(errors.editNote)}
              />
              {errors.editNote && <p className="text-xs text-destructive">{errors.editNote}</p>}
            </div>
          )}

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
              Hủy
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
