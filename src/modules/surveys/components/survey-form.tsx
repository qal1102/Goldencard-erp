'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, SaveIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
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
import { createEmptyZone } from '../lib/survey-form-defaults';
import {
  GRID_VOLTAGES,
  GRID_VOLTAGE_LABELS,
  POWER_PHASES,
  POWER_PHASE_LABELS,
  PROJECT_SCALES,
  PROJECT_SCALE_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  SYSTEM_TYPES,
  SYSTEM_TYPE_LABELS,
  type ProjectScale,
  type UpdateSurveyInput,
  updateSurveySchema,
} from '../schema/survey.schema';
import { SurveyInfrastructureSection } from './survey-infrastructure-section';
import { SurveyZoneFormCard } from './survey-zone-form-card';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

type DefaultValues = Partial<UpdateSurveyInput>;

type Props = {
  defaultValues?: DefaultValues;
  onSubmit: (data: UpdateSurveyInput) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  /** When true, requires editNote (completed survey correction) */
  requireEditNote?: boolean;
};

export function SurveyForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  requireEditNote = false,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateSurveyInput>({
    resolver: zodResolver(updateSurveySchema),
    defaultValues: {
      projectType: 'residential',
      projectScale: 'single',
      zones: [createEmptyZone()],
      ...defaultValues,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'zones',
  });

  const pending = isPending || isSubmitting;
  const projectScale = (useWatch({ control, name: 'projectScale' }) ?? 'single') as ProjectScale;
  const isMulti = projectScale === 'multi';

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (projectScale === 'single') {
      const current = getValues('zones') ?? [];
      if (current.length === 0) {
        replace([createEmptyZone()]);
      } else if (current.length > 1) {
        replace([current[0] ?? createEmptyZone()]);
      } else if (!current[0]?.zoneName?.trim()) {
        setValue('zones.0.zoneName', 'Mái chính');
      }
    }
  }, [projectScale, getValues, replace, setValue]);

  const handleScaleChange = (scale: ProjectScale) => {
    setValue('projectScale', scale);
    if (scale === 'single') {
      const first = getValues('zones')?.[0] ?? createEmptyZone();
      if (!first.zoneName?.trim()) first.zoneName = 'Mái chính';
      replace([first]);
    }
  };

  const handleAddZone = () => {
    append(createEmptyZone(`Khu ${fields.length + 1}`));
  };

  const handleCancel = () => {
    if (isDirty && !confirm('Bạn có thay đổi chưa lưu. Rời khỏi form và bỏ các thay đổi này?')) {
      return;
    }
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Địa điểm khảo sát</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-address">
              Địa chỉ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sf-address"
              {...register('address')}
              aria-invalid={Boolean(errors.address)}
            />
            <FieldError message={errors.address?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-province">Tỉnh / Thành phố</Label>
            <Input id="sf-province" {...register('province')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-scheduledAt">Ngày hẹn khảo sát</Label>
            <Input id="sf-scheduledAt" type="datetime-local" {...register('scheduledAt')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phân loại công trình</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-projectType">Loại công trình</Label>
            <Controller
              control={control}
              name="projectType"
              render={({ field }) => (
                <Select value={field.value ?? 'residential'} onValueChange={field.onChange}>
                  <SelectTrigger id="sf-projectType" className="w-full">
                    <SelectValue>
                      {(value) =>
                        PROJECT_TYPE_LABELS[
                          (value as (typeof PROJECT_TYPES)[number]) ?? 'residential'
                        ]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROJECT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-projectScale">Quy mô khảo sát</Label>
            <Controller
              control={control}
              name="projectScale"
              render={({ field }) => (
                <Select
                  value={field.value ?? 'single'}
                  onValueChange={(v) => {
                    field.onChange(v);
                    handleScaleChange(v as ProjectScale);
                  }}
                >
                  <SelectTrigger id="sf-projectScale" className="w-full">
                    <SelectValue>
                      {(value) =>
                        PROJECT_SCALE_LABELS[(value as ProjectScale) ?? 'single']
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_SCALES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_SCALE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-floors">Số tầng / quy mô công trình</Label>
            <Input
              id="sf-floors"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="1"
              {...register('floors')}
            />
            <FieldError message={errors.floors?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Khu vực lắp đặt</CardTitle>
            {isMulti && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddZone}>
                <PlusIcon className="size-3.5" />
                Thêm khu
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FieldError message={errors.zones?.message ?? errors.zones?.root?.message} />
          {fields.map((field, index) => (
            <SurveyZoneFormCard
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              defaultOpen={index === 0}
              showRemove={isMulti && fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hệ thống điện &amp; thiết bị chung</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-gridVoltage">Loại điện</Label>
            <Controller
              control={control}
              name="gridVoltage"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger id="sf-gridVoltage" className="w-full">
                    <SelectValue placeholder="Chọn loại điện...">
                      {(value) =>
                        value
                          ? GRID_VOLTAGE_LABELS[value as keyof typeof GRID_VOLTAGE_LABELS]
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GRID_VOLTAGES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {GRID_VOLTAGE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-meterCapacityA">CB tổng (A)</Label>
            <Input
              id="sf-meterCapacityA"
              type="number"
              inputMode="numeric"
              min="0"
              {...register('meterCapacityA')}
            />
            <FieldError message={errors.meterCapacityA?.message} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-systemType">Loại hệ thống</Label>
              <Controller
                control={control}
                name="systemType"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger id="sf-systemType" className="w-full">
                      <SelectValue placeholder="Chọn...">
                        {(value) =>
                          value
                            ? SYSTEM_TYPE_LABELS[value as keyof typeof SYSTEM_TYPE_LABELS]
                            : null
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {SYSTEM_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-powerPhase">Pha điện</Label>
              <Controller
                control={control}
                name="powerPhase"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger id="sf-powerPhase" className="w-full">
                      <SelectValue placeholder="Chọn...">
                        {(value) =>
                          value
                            ? POWER_PHASE_LABELS[value as keyof typeof POWER_PHASE_LABELS]
                            : null
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {POWER_PHASES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {POWER_PHASE_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-inverterType">Loại inverter</Label>
              <Input
                id="sf-inverterType"
                placeholder="vd: Solis 50kW, Growatt..."
                {...register('inverterType')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-inverterQuantity">Số lượng inverter</Label>
              <Input
                id="sf-inverterQuantity"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="1"
                {...register('inverterQuantity')}
              />
              <FieldError message={errors.inverterQuantity?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <SurveyInfrastructureSection control={control} register={register} errors={errors} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ghi chú</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-siteNotes">Ghi chú hiện trường</Label>
            <Textarea id="sf-siteNotes" rows={4} {...register('siteNotes')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-photosNote">Link ảnh/tài liệu khảo sát</Label>
            <Textarea
              id="sf-photosNote"
              rows={3}
              placeholder={'Mỗi dòng một link — Google Drive, Google Photos, Zalo album, OneDrive...'}
              {...register('photosNote')}
            />
            <p className="text-xs text-muted-foreground">
              Dán link ảnh/tài liệu hiện trường. Tính năng upload trực tiếp sẽ có trong bản cập nhật sau.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-internalNotes">Ghi chú nội bộ</Label>
            <Textarea id="sf-internalNotes" rows={3} {...register('internalNotes')} />
          </div>
        </CardContent>
      </Card>

      {requireEditNote && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
              Lý do chỉnh sửa
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 pt-0">
            <Label htmlFor="sf-editNote">Ghi chú bắt buộc</Label>
            <Textarea
              id="sf-editNote"
              rows={3}
              placeholder="Mô tả ngắn lý do chỉnh sửa phiếu đã hoàn thành..."
              {...register('editNote')}
              aria-invalid={Boolean(errors.editNote)}
            />
            <FieldError message={errors.editNote?.message} />
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isDirty ? 'Có thay đổi chưa lưu' : 'Dữ liệu chỉ được lưu sau khi bấm nút lưu'}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 px-4 font-semibold sm:flex-none"
            onClick={handleCancel}
            disabled={pending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="h-11 flex-1 px-4 text-sm font-semibold shadow-sm sm:flex-none"
            disabled={pending}
          >
            <SaveIcon className="size-4" />
            {pending ? 'Đang lưu...' : requireEditNote ? 'Lưu chỉnh sửa' : 'Lưu khảo sát'}
          </Button>
        </div>
      </div>
    </form>
  );
}
