'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
  INSTALLATION_DIFFICULTIES,
  INSTALLATION_DIFFICULTY_LABELS,
  POWER_PHASES,
  POWER_PHASE_LABELS,
  ROOF_TYPES,
  ROOF_TYPE_LABELS,
  SYSTEM_TYPES,
  SYSTEM_TYPE_LABELS,
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSurveyInput>({
    resolver: zodResolver(updateSurveySchema),
    defaultValues: defaultValues ?? {},
  });

  const pending = isPending || isSubmitting;

  // Auto-calculate recommended panel quantity
  const recommendedSystemKw = useWatch({ control, name: 'recommendedSystemKw' });
  const panelWattageW = useWatch({ control, name: 'panelWattageW' });

  useEffect(() => {
    const kw = parseFloat(recommendedSystemKw ?? '');
    const w = parseInt(panelWattageW ?? '550', 10);
    if (kw > 0 && w > 0) {
      setValue('recommendedPanelQuantity', String(Math.ceil((kw * 1000) / w)));
    }
  }, [recommendedSystemKw, panelWattageW, setValue]);

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

      {/* Technical Proposal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Đề xuất kỹ thuật &amp; vật tư</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* System sizing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-recommendedSystemKw">Công suất hệ thống (kWp)</Label>
              <Input
                id="sf-recommendedSystemKw"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="vd: 5.5"
                {...register('recommendedSystemKw')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-panelWattageW">Công suất tấm pin (W)</Label>
              <Input
                id="sf-panelWattageW"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="550"
                {...register('panelWattageW')}
              />
              <FieldError message={errors.panelWattageW?.message} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-recommendedPanelQuantity">
              Số tấm pin (tự tính)
            </Label>
            <Input
              id="sf-recommendedPanelQuantity"
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="Tự động tính từ kWp và W/tấm"
              {...register('recommendedPanelQuantity')}
            />
            <p className="text-xs text-muted-foreground">
              Tự động = ⌈kWp × 1000 ÷ W/tấm⌉. Có thể chỉnh tay.
            </p>
            <FieldError message={errors.recommendedPanelQuantity?.message} />
          </div>

          {/* System type & phase */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Inverter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-inverterType">Loại inverter</Label>
              <Input
                id="sf-inverterType"
                placeholder="vd: Solis 5kW, Growatt 10kW..."
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-inverterLocation">Vị trí lắp inverter</Label>
            <Input
              id="sf-inverterLocation"
              placeholder="vd: Tầng 1 gần tủ điện, ngoài trời có mái che..."
              {...register('inverterLocation')}
            />
          </div>

          {/* Roof structure */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-roofStructureCondition">Tình trạng kết cấu mái</Label>
            <Textarea
              id="sf-roofStructureCondition"
              placeholder="Mô tả tình trạng, độ chắc chắn của mái..."
              rows={2}
              {...register('roofStructureCondition')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="needsRoofReinforcement"
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="sf-needsRoofReinforcement"
                  className="h-4 w-4 rounded border border-input accent-primary"
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <Label htmlFor="sf-needsRoofReinforcement" className="font-normal">
              Cần gia cố mái trước khi lắp
            </Label>
          </div>

          {/* Cable & electrical cabinet */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-cableRouteDistanceM">Khoảng cách đi dây (m)</Label>
              <Input
                id="sf-cableRouteDistanceM"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="vd: 15"
                {...register('cableRouteDistanceM')}
              />
              <FieldError message={errors.cableRouteDistanceM?.message} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-mainBreakerCapacityA">CB chính (A)</Label>
              <Input
                id="sf-mainBreakerCapacityA"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="vd: 100"
                {...register('mainBreakerCapacityA')}
              />
              <FieldError message={errors.mainBreakerCapacityA?.message} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-mainElectricalCabinetCondition">Tình trạng tủ điện chính</Label>
            <Textarea
              id="sf-mainElectricalCabinetCondition"
              placeholder="Mô tả tình trạng tủ điện, số CB hiện có..."
              rows={2}
              {...register('mainElectricalCabinetCondition')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="needsElectricalCabinetUpgrade"
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="sf-needsElectricalCabinetUpgrade"
                  className="h-4 w-4 rounded border border-input accent-primary"
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <Label htmlFor="sf-needsElectricalCabinetUpgrade" className="font-normal">
              Cần nâng cấp tủ điện
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="hasGrounding"
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="sf-hasGrounding"
                  className="h-4 w-4 rounded border border-input accent-primary"
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <Label htmlFor="sf-hasGrounding" className="font-normal">
              Đã có hệ thống tiếp địa
            </Label>
          </div>

          {/* Installation difficulty */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-installationDifficulty">Độ khó thi công</Label>
            <Controller
              control={control}
              name="installationDifficulty"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger id="sf-installationDifficulty" className="w-full">
                    <SelectValue placeholder="Chọn...">
                      {(value) =>
                        value
                          ? INSTALLATION_DIFFICULTY_LABELS[
                              value as keyof typeof INSTALLATION_DIFFICULTY_LABELS
                            ]
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLATION_DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {INSTALLATION_DIFFICULTY_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-extraMaterialsNote">Vật tư phụ / Ghi chú vật tư</Label>
            <Textarea
              id="sf-extraMaterialsNote"
              placeholder="Liệt kê vật tư phụ cần thêm, ống luồn dây, thanh ray đặc biệt..."
              rows={3}
              {...register('extraMaterialsNote')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-installationPlanNote">Kế hoạch thi công</Label>
            <Textarea
              id="sf-installationPlanNote"
              placeholder="Phương án thi công, lưu ý an toàn, các bước thực hiện..."
              rows={3}
              {...register('installationPlanNote')}
            />
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
