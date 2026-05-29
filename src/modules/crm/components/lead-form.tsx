'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCreateLead, useUpdateLead } from '../hooks/use-leads';
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  createLeadSchema,
  type CreateLeadInput,
} from '../schema/lead.schema';
import { getAssignableUserLabel, getLeadSourceLabel } from '../lib/lead-labels';

type AssignableUser = { id: string; name: string };

type Props = {
  mode: 'create' | 'edit';
  leadId?: string;
  defaultValues?: Partial<CreateLeadInput>;
  assignableUsers: AssignableUser[];
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function LeadForm({ mode, leadId, defaultValues, assignableUsers }: Props) {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead(leadId ?? '');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      source: 'direct',
      ...defaultValues,
    },
  });

  const onSubmit = async (data: CreateLeadInput) => {
    const cleanData: CreateLeadInput = {
      fullName: data.fullName,
      phone: data.phone,
      source: data.source,
      ...(data.email?.trim() ? { email: data.email.trim() } : {}),
      ...(data.address?.trim() ? { address: data.address.trim() } : {}),
      ...(data.province?.trim() ? { province: data.province.trim() } : {}),
      ...(data.expectedCapacity?.trim() ? { expectedCapacity: data.expectedCapacity.trim() } : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
      ...(data.assignedTo != null ? { assignedTo: data.assignedTo } : {}),
    };

    try {
      if (mode === 'create') {
        const result = await createLead.mutateAsync(cleanData);
        if (!result.success) {
          alert(result.error);
        }
      } else if (leadId) {
        const result = await updateLead.mutateAsync(cleanData);
        if (!result.success) {
          alert(result.error);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  };

  const isPending = isSubmitting || createLead.isPending || updateLead.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={leadId ? `/crm/leads/${leadId}` : '/crm/leads'} />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="font-medium">{mode === 'create' ? 'Thêm lead mới' : 'Chỉnh sửa lead'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin liên hệ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">
                Họ và tên <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                {...register('fullName')}
                aria-invalid={Boolean(errors.fullName)}
              />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">
                Số điện thoại <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0901234567"
                inputMode="numeric"
                {...register('phone')}
                aria-invalid={Boolean(errors.phone)}
              />
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...register('email')}
                aria-invalid={Boolean(errors.email)}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Địa chỉ lắp đặt</Label>
              <Input
                id="address"
                placeholder="Số nhà, đường, phường/xã..."
                {...register('address')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="province">Tỉnh / Thành phố</Label>
              <Input id="province" placeholder="Hà Nội" {...register('province')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">
                Nguồn <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="source" aria-invalid={Boolean(errors.source)} className="w-full">
                      <SelectValue placeholder="Chọn nguồn...">
                        {(value) => getLeadSourceLabel(value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_SOURCE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.source?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedCapacity">Công suất dự kiến</Label>
              <Input
                id="expectedCapacity"
                placeholder="vd: 8kW, 10kW..."
                {...register('expectedCapacity')}
              />
            </div>

            {assignableUsers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignedTo">Phân công cho</Label>
                <Controller
                  control={control}
                  name="assignedTo"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(val) => field.onChange(val || null)}
                    >
                      <SelectTrigger id="assignedTo" className="w-full">
                        <SelectValue placeholder="Chưa phân công">
                          {(value) =>
                            value ? getAssignableUserLabel(value, assignableUsers) : null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Chưa phân công</SelectItem>
                        {assignableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                placeholder="Thông tin thêm về khách hàng..."
                rows={3}
                {...register('notes')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={leadId ? `/crm/leads/${leadId}` : '/crm/leads'} />}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Đang lưu...' : mode === 'create' ? 'Tạo lead' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
