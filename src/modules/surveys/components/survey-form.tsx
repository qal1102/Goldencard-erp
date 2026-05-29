'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  GRID_VOLTAGES,
  GRID_VOLTAGE_LABELS,
  ROOF_TYPES,
  ROOF_TYPE_LABELS,
  type UpdateSurveyInput,
  updateSurveySchema,
} from '../schema/survey.schema';

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
};

export function SurveyForm({ defaultValues, onSubmit, onCancel, isPending }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSurveyInput>({
    resolver: zodResolver(updateSurveySchema),
    defaultValues: defaultValues ?? {},
  });

  const pending = isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Location */}
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
            <Input
              id="sf-scheduledAt"
              type="datetime-local"
              {...register('scheduledAt')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Roof */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin mái nhà</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-roofType">Loại mái</Label>
            <Controller
              control={control}
              name="roofType"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger id="sf-roofType" className="w-full">
                    <SelectValue placeholder="Chọn loại mái...">
                      {(value) =>
                        value ? ROOF_TYPE_LABELS[value as keyof typeof ROOF_TYPE_LABELS] : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROOF_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ROOF_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-roofMaterial">Vật liệu mái</Label>
            <Input
              id="sf-roofMaterial"
              placeholder="vd: Tôn, Ngói, Bê tông..."
              {...register('roofMaterial')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-roofAreaM2">Diện tích mái (m²)</Label>
              <Input
                id="sf-roofAreaM2"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="0.0"
                {...register('roofAreaM2')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-roofTiltDeg">Độ dốc (°)</Label>
              <Input
                id="sf-roofTiltDeg"
                type="number"
                inputMode="numeric"
                min="0"
                max="90"
                placeholder="0–90"
                {...register('roofTiltDeg')}
              />
              <FieldError message={errors.roofTiltDeg?.message} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-roofOrientation">Hướng mái</Label>
            <Input
              id="sf-roofOrientation"
              placeholder="vd: Nam, Đông Nam, Tây..."
              {...register('roofOrientation')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-floors">Số tầng</Label>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-shadingNotes">Bóng che / Vật cản</Label>
            <Textarea
              id="sf-shadingNotes"
              placeholder="Mô tả bóng che từ cây cối, công trình lân cận..."
              rows={3}
              {...register('shadingNotes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Electrical */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hệ thống điện</CardTitle>
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
              placeholder="vd: 40, 63, 100..."
              {...register('meterCapacityA')}
            />
            <FieldError message={errors.meterCapacityA?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ghi chú</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-siteNotes">Ghi chú hiện trường</Label>
            <Textarea
              id="sf-siteNotes"
              placeholder="Hiện trạng công trình, lưu ý thi công, thông tin thêm..."
              rows={4}
              {...register('siteNotes')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-photosNote">Ảnh hiện trường</Label>
            <Input
              id="sf-photosNote"
              placeholder="vd: Đã chụp 10 ảnh mái và tủ điện"
              {...register('photosNote')}
            />
            <p className="text-xs text-muted-foreground">
              Tính năng upload ảnh sẽ có trong bản cập nhật sau.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-internalNotes">Ghi chú nội bộ</Label>
            <Textarea
              id="sf-internalNotes"
              placeholder="Ghi chú cho đội kinh doanh..."
              rows={3}
              {...register('internalNotes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu...' : 'Lưu khảo sát'}
        </Button>
      </div>
    </form>
  );
}
