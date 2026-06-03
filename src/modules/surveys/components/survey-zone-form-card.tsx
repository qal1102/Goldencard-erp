'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, Trash2Icon } from 'lucide-react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
  calcEstimatedKwFromPanels,
  calcPanelQuantityFromKw,
  parsePositiveFloat,
  parsePositiveInt,
} from '../lib/survey-sizing-calc';
import {
  INSTALLATION_DIFFICULTIES,
  INSTALLATION_DIFFICULTY_LABELS,
  ROOF_TYPES,
  ROOF_TYPE_LABELS,
  type UpdateSurveyInput,
} from '../schema/survey.schema';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

type Props = {
  index: number;
  control: Control<UpdateSurveyInput>;
  register: UseFormRegister<UpdateSurveyInput>;
  errors: FieldErrors<UpdateSurveyInput>;
  setValue: UseFormSetValue<UpdateSurveyInput>;
  defaultOpen?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
};

export function SurveyZoneFormCard({
  index,
  control,
  register,
  errors,
  setValue,
  defaultOpen = true,
  showRemove = false,
  onRemove,
}: Props) {
  const zoneErrors = errors.zones?.[index];
  const zoneName = useWatch({ control, name: `zones.${index}.zoneName` });
  const recommendedSystemKw = useWatch({ control, name: `zones.${index}.recommendedSystemKw` });
  const panelWattageW = useWatch({ control, name: `zones.${index}.panelWattageW` });
  const recommendedPanelQuantity = useWatch({
    control,
    name: `zones.${index}.recommendedPanelQuantity`,
  });
  const [panelQtyManual, setPanelQtyManual] = useState(false);

  useEffect(() => {
    if (panelQtyManual) return;

    const kw = parsePositiveFloat(recommendedSystemKw);
    const panelW = parsePositiveInt(panelWattageW, 550);
    if (kw > 0 && panelW > 0) {
      setValue(
        `zones.${index}.recommendedPanelQuantity`,
        String(calcPanelQuantityFromKw(kw, panelW)),
      );
    }
  }, [recommendedSystemKw, panelWattageW, panelQtyManual, index, setValue]);

  const estimatedSystemKw = useMemo(() => {
    const qty = parsePositiveInt(recommendedPanelQuantity ?? '');
    const panelW = parsePositiveInt(panelWattageW, 550);
    if (qty <= 0 || panelW <= 0) return null;
    return calcEstimatedKwFromPanels(qty, panelW);
  }, [recommendedPanelQuantity, panelWattageW]);

  const subtitle =
    recommendedSystemKw && parseFloat(recommendedSystemKw) > 0
      ? `${recommendedSystemKw} kWp`
      : estimatedSystemKw != null
        ? `~${estimatedSystemKw.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kWp`
        : 'Nhập dữ liệu khu vực';

  return (
    <details className="group rounded-lg border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            Khu {index + 1}: {zoneName?.trim() || 'Chưa đặt tên'}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {showRemove && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </summary>

      <div className="flex flex-col gap-4 border-t px-3 py-4 sm:px-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-name`}>
            Tên khu vực <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`zone-${index}-name`}
            placeholder='vd: Mái A, Kho chính, Văn phòng...'
            {...register(`zones.${index}.zoneName`)}
          />
          <FieldError message={zoneErrors?.zoneName?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-roofType`}>Loại mái</Label>
          <Controller
            control={control}
            name={`zones.${index}.roofType`}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <SelectTrigger id={`zone-${index}-roofType`} className="w-full">
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
          <Label htmlFor={`zone-${index}-roofMaterial`}>Vật liệu mái</Label>
          <Input
            id={`zone-${index}-roofMaterial`}
            placeholder="vd: Tôn, Ngói, Bê tông..."
            {...register(`zones.${index}.roofMaterial`)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-usableAreaM2`}>Diện tích sử dụng (m²)</Label>
            <Input
              id={`zone-${index}-usableAreaM2`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              {...register(`zones.${index}.usableAreaM2`)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-roofTiltDeg`}>Độ dốc (°)</Label>
            <Input
              id={`zone-${index}-roofTiltDeg`}
              type="number"
              inputMode="numeric"
              min="0"
              max="90"
              {...register(`zones.${index}.roofTiltDeg`)}
            />
            <FieldError message={zoneErrors?.roofTiltDeg?.message} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-roofOrientation`}>Hướng mái</Label>
          <Input
            id={`zone-${index}-roofOrientation`}
            placeholder="vd: Nam, Đông Nam..."
            {...register(`zones.${index}.roofOrientation`)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-shadingNotes`}>Bóng che / Vật cản</Label>
          <Textarea
            id={`zone-${index}-shadingNotes`}
            rows={2}
            {...register(`zones.${index}.shadingNotes`)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-roofStructureCondition`}>Tình trạng kết cấu mái</Label>
          <Textarea
            id={`zone-${index}-roofStructureCondition`}
            rows={2}
            {...register(`zones.${index}.roofStructureCondition`)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name={`zones.${index}.needsRoofReinforcement`}
            render={({ field }) => (
              <input
                type="checkbox"
                id={`zone-${index}-needsRoofReinforcement`}
                className="h-4 w-4 rounded border border-input accent-primary"
                checked={field.value ?? false}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <Label htmlFor={`zone-${index}-needsRoofReinforcement`} className="font-normal">
            Cần gia cố mái trước khi lắp
          </Label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-recommendedSystemKw`}>Công suất đề xuất (kWp)</Label>
            <Input
              id={`zone-${index}-recommendedSystemKw`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              {...register(`zones.${index}.recommendedSystemKw`, {
                onChange: () => {
                  setPanelQtyManual(false);
                },
              })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-panelWattageW`}>Công suất tấm pin (W)</Label>
            <Input
              id={`zone-${index}-panelWattageW`}
              type="number"
              inputMode="numeric"
              min="1"
              placeholder="550"
              {...register(`zones.${index}.panelWattageW`, {
                onChange: () => {
                  setPanelQtyManual(false);
                },
              })}
            />
            <FieldError message={zoneErrors?.panelWattageW?.message} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-recommendedPanelQuantity`}>Số tấm pin</Label>
          <Input
            id={`zone-${index}-recommendedPanelQuantity`}
            type="number"
            inputMode="numeric"
            min="1"
            {...register(`zones.${index}.recommendedPanelQuantity`, {
              onChange: () => {
                setPanelQtyManual(true);
              },
            })}
          />
          <p className="text-xs text-muted-foreground">
            Tự động tính từ công suất hệ thống và công suất tấm pin. Có thể chỉnh tay.
          </p>
          {estimatedSystemKw != null && (
            <p className="text-xs text-muted-foreground">
              Công suất ước tính:{' '}
              <span className="font-medium text-foreground">
                {estimatedSystemKw.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kWp
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-inverterLocation`}>Vị trí inverter (khu này)</Label>
          <Input
            id={`zone-${index}-inverterLocation`}
            {...register(`zones.${index}.inverterLocation`)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-cableRouteDistanceM`}>Khoảng cách đi dây (m)</Label>
            <Input
              id={`zone-${index}-cableRouteDistanceM`}
              type="number"
              inputMode="numeric"
              min="0"
              {...register(`zones.${index}.cableRouteDistanceM`)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`zone-${index}-installationDifficulty`}>Độ khó thi công</Label>
            <Controller
              control={control}
              name={`zones.${index}.installationDifficulty`}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger id={`zone-${index}-installationDifficulty`} className="w-full">
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-cableRouteNotes`}>Ghi chú tuyến dây</Label>
          <Textarea
            id={`zone-${index}-cableRouteNotes`}
            rows={2}
            {...register(`zones.${index}.cableRouteNotes`)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-extraMaterialsNote`}>Vật tư phụ</Label>
          <Textarea
            id={`zone-${index}-extraMaterialsNote`}
            rows={2}
            {...register(`zones.${index}.extraMaterialsNote`)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`zone-${index}-installationPlanNote`}>Kế hoạch thi công</Label>
          <Textarea
            id={`zone-${index}-installationPlanNote`}
            rows={2}
            {...register(`zones.${index}.installationPlanNote`)}
          />
        </div>
      </div>
    </details>
  );
}
