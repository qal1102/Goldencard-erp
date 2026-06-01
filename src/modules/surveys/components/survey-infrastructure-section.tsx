'use client';

import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UpdateSurveyInput } from '../schema/survey.schema';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

type Props = {
  control: Control<UpdateSurveyInput>;
  register: UseFormRegister<UpdateSurveyInput>;
  errors: FieldErrors<UpdateSurveyInput>;
};

function CheckboxField({
  control,
  name,
  id,
  label,
}: {
  control: Control<UpdateSurveyInput>;
  name:
    | 'inverterAreaNearMainPower'
    | 'inverterAreaCleanDryVentilated'
    | 'inverterAreaHasShelter'
    | 'needsInverterShelterOrRack'
    | 'needsElectricalCabinetUpgrade'
    | 'hasGrounding';
  id: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <input
            type="checkbox"
            id={id}
            className="h-4 w-4 rounded border border-input accent-primary"
            checked={field.value ?? false}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

export function SurveyInfrastructureSection({ control, register, errors }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Hạ tầng điện &amp; inverter (toàn dự án)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-plannedInverterArea">Khu vực lắp inverter</Label>
          <Textarea
            id="sf-plannedInverterArea"
            rows={2}
            placeholder="Mô tả vị trí dự kiến lắp inverter..."
            {...register('plannedInverterArea')}
          />
        </div>

        <CheckboxField
          control={control}
          id="sf-inverterAreaNearMainPower"
          name="inverterAreaNearMainPower"
          label="Gần nguồn điện chính"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-inverterAreaDistanceToMainCabinetM">
            Khoảng cách đến tủ điện chính (m)
          </Label>
          <Input
            id="sf-inverterAreaDistanceToMainCabinetM"
            type="number"
            inputMode="numeric"
            min="0"
            {...register('inverterAreaDistanceToMainCabinetM')}
          />
          <FieldError message={errors.inverterAreaDistanceToMainCabinetM?.message} />
        </div>

        <CheckboxField
          control={control}
          id="sf-inverterAreaCleanDryVentilated"
          name="inverterAreaCleanDryVentilated"
          label="Khu vực khô ráo, thoáng mát"
        />
        <CheckboxField
          control={control}
          id="sf-inverterAreaHasShelter"
          name="inverterAreaHasShelter"
          label="Có mái che sẵn"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-inverterAreaRiskNotes">Rủi ro / lưu ý khu inverter</Label>
          <Textarea id="sf-inverterAreaRiskNotes" rows={2} {...register('inverterAreaRiskNotes')} />
        </div>

        <CheckboxField
          control={control}
          id="sf-needsInverterShelterOrRack"
          name="needsInverterShelterOrRack"
          label="Cần làm mái che / giá đỡ inverter"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-mainPowerConnectionPoint">Điểm nối nguồn chính</Label>
          <Input id="sf-mainPowerConnectionPoint" {...register('mainPowerConnectionPoint')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-mainCabinetLocation">Vị trí tủ điện chính</Label>
          <Input id="sf-mainCabinetLocation" {...register('mainCabinetLocation')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-mainBreakerCapacityA">CB chính (A)</Label>
            <Input
              id="sf-mainBreakerCapacityA"
              type="number"
              inputMode="numeric"
              min="0"
              {...register('mainBreakerCapacityA')}
            />
            <FieldError message={errors.mainBreakerCapacityA?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-groundingLocation">Vị trí tiếp địa</Label>
            <Input id="sf-groundingLocation" {...register('groundingLocation')} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-mainElectricalCabinetCondition">Tình trạng tủ điện chính</Label>
          <Textarea
            id="sf-mainElectricalCabinetCondition"
            rows={2}
            {...register('mainElectricalCabinetCondition')}
          />
        </div>

        <CheckboxField
          control={control}
          id="sf-needsElectricalCabinetUpgrade"
          name="needsElectricalCabinetUpgrade"
          label="Cần nâng cấp tủ điện"
        />
        <CheckboxField
          control={control}
          id="sf-hasGrounding"
          name="hasGrounding"
          label="Đã có hệ thống tiếp địa"
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-mainCableRouteNotes">Tuyến cáp chính</Label>
          <Textarea id="sf-mainCableRouteNotes" rows={2} {...register('mainCableRouteNotes')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-maintenanceAccessNotes">Lối bảo trì</Label>
          <Textarea id="sf-maintenanceAccessNotes" rows={2} {...register('maintenanceAccessNotes')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-fireSafetyNotes">PCCC / An toàn cháy nổ</Label>
          <Textarea id="sf-fireSafetyNotes" rows={2} {...register('fireSafetyNotes')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sf-generalTechnicalRiskNotes">Rủi ro kỹ thuật chung</Label>
          <Textarea
            id="sf-generalTechnicalRiskNotes"
            rows={3}
            {...register('generalTechnicalRiskNotes')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
