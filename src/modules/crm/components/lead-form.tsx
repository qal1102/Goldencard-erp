'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BackButton } from '@/components/navigation/back-button';
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
import { ExistingCustomerPhoneAlert } from './existing-customer-phone-alert';
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
  linkedCustomer?: { id: string; code: string; fullName: string };
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function LeadForm({ mode, leadId, defaultValues, assignableUsers, linkedCustomer }: Props) {
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

  const selectedSource = useWatch({ control, name: 'source' });
  const watchedPhone = useWatch({ control, name: 'phone' }) ?? '';

  const onSubmit = async (data: CreateLeadInput) => {
    // zodResolver + z.preprocess already normalised the data (empty strings → undefined).
    // toNull() in the server action converts undefined/empty to null before DB insert.
    // We only clear referral fields when source is not 'referral' to avoid stale hidden values.
    const payload: CreateLeadInput = {
      ...data,
      customerId: linkedCustomer?.id ?? data.customerId,
      referrerName: data.source === 'referral' ? data.referrerName : undefined,
      referrerPhone: data.source === 'referral' ? data.referrerPhone : undefined,
      referralNote: data.source === 'referral' ? data.referralNote : undefined,
    };

    try {
      if (mode === 'create') {
        const result = await createLead.mutateAsync(payload);
        if (!result.success) {
          console.error('[LeadForm] create failed:', result.error);
          alert(result.error);
        }
      } else if (leadId) {
        const result = await updateLead.mutateAsync(payload);
        if (!result.success) {
          console.error('[LeadForm] update failed:', result.error);
          alert(result.error);
        }
      }
    } catch (err) {
      console.error('[LeadForm] unexpected error:', err);
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  };

  const isPending = isSubmitting || createLead.isPending || updateLead.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref={leadId ? `/crm/leads/${leadId}` : '/crm/leads'} />
        <h1 className="font-medium">
          {mode === 'create'
            ? linkedCustomer
              ? 'Tạo cơ hội / dự án mới'
              : 'Thêm cơ hội mới'
            : 'Chỉnh sửa cơ hội'}
        </h1>
      </div>

      {linkedCustomer && mode === 'create' && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <LinkIcon className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Cơ hội mới sẽ liên kết với khách hàng hiện có{' '}
            <Link
              href={`/crm/customers/${linkedCustomer.id}`}
              className="font-mono font-medium hover:underline"
            >
              {linkedCustomer.code}
            </Link>{' '}
            ({linkedCustomer.fullName}). Nhập địa chỉ lắp đặt cho dự án mới bên dưới.
          </p>
        </div>
      )}

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
              {mode === 'create' && !linkedCustomer && (
                <ExistingCustomerPhoneAlert phone={watchedPhone} />
              )}
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

            <div className="rounded-lg border border-dashed p-3 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Địa chỉ lắp đặt dự án</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">
                Địa chỉ lắp đặt <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                placeholder="Số nhà, đường, phường/xã..."
                {...register('address')}
                aria-invalid={Boolean(errors.address)}
              />
              <FieldError message={errors.address?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="province">Tỉnh / Thành phố</Label>
              <Input id="province" placeholder="Hà Nội" {...register('province')} />
            </div>
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

            {selectedSource === 'referral' && (
              <div className="rounded-lg border border-dashed p-3 flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground">Thông tin giới thiệu</p>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="referrerName">
                    Người giới thiệu <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="referrerName"
                    placeholder="Tên người giới thiệu"
                    {...register('referrerName')}
                    aria-invalid={Boolean(errors.referrerName)}
                  />
                  <FieldError message={errors.referrerName?.message} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="referrerPhone">SĐT người giới thiệu</Label>
                  <Input
                    id="referrerPhone"
                    type="tel"
                    placeholder="0901234567"
                    inputMode="numeric"
                    {...register('referrerPhone')}
                    aria-invalid={Boolean(errors.referrerPhone)}
                  />
                  <FieldError message={errors.referrerPhone?.message} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="referralNote">Ghi chú giới thiệu</Label>
                  <Textarea
                    id="referralNote"
                    placeholder="Ghi chú thêm về nguồn giới thiệu..."
                    rows={2}
                    {...register('referralNote')}
                  />
                </div>
              </div>
            )}

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
                <Label htmlFor="assignedTo">Người phụ trách / Sales phụ trách</Label>
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
                {isPending ? 'Đang lưu...' : mode === 'create' ? 'Tạo cơ hội' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
