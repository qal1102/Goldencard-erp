'use client';

import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
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
import type { UpdateQuotationInput } from '../schema/quotation.schema';
import {
  getQuotationItemTemplateLabel,
  getQuotationItemTemplates,
} from '../lib/quotation-item-templates';
import {
  QUOTATION_ITEM_UNIT_CUSTOM,
  QUOTATION_ITEM_UNITS,
  isPresetUnit,
} from '../lib/quotation-item-units';

type ItemFieldErrors = {
  productName?: { message?: string };
  quantity?: { message?: string };
  unit?: { message?: string };
  unitPrice?: { message?: string };
};

type Props = {
  idx: number;
  control: Control<UpdateQuotationInput>;
  register: ReturnType<typeof import('react-hook-form').useForm<UpdateQuotationInput>>['register'];
  setValue: UseFormSetValue<UpdateQuotationInput>;
  errors?: ItemFieldErrors;
  unitValue: string;
  unitPrice: number;
  lineTotal: number;
  panelWattageW: number;
  canRemove: boolean;
  onRemove: () => void;
  formatCurrency: (num: number) => string;
  inventoryItems: Array<{
    id: string;
    sku: string;
    name: string;
    category: string | null;
    specification: string | null;
    unit: string;
    imageUrl: string | null;
  }>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function QuotationItemRow({
  idx,
  control,
  register,
  setValue,
  errors: itemErrors,
  unitValue,
  unitPrice,
  lineTotal,
  panelWattageW,
  canRemove,
  onRemove,
  formatCurrency,
  inventoryItems,
}: Props) {
  const templates = getQuotationItemTemplates(panelWattageW);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const unitSelectValue = isPresetUnit(unitValue) ? unitValue : QUOTATION_ITEM_UNIT_CUSTOM;
  const showCustomUnit = unitSelectValue === QUOTATION_ITEM_UNIT_CUSTOM;

  const applyInventoryItem = (itemId: string | null) => {
    const selected = inventoryItems.find((item) => item.id === itemId);
    if (!selected) {
      setValue(`items.${idx}.inventoryItemId`, null);
      return;
    }

    setValue(`items.${idx}.inventoryItemId`, selected.id, { shouldValidate: true });
    setSelectedTemplateId('');
    setValue(`items.${idx}.productName`, selected.name, { shouldValidate: true });
    setValue(`items.${idx}.description`, selected.specification ?? selected.category ?? '');
    setValue(`items.${idx}.unit`, selected.unit, { shouldValidate: true });
  };

  const applyTemplate = (templateId: string | null) => {
    if (!templateId) return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setValue(`items.${idx}.inventoryItemId`, null);
    setValue(`items.${idx}.productName`, template.productName, { shouldValidate: true });
    setValue(`items.${idx}.description`, template.description);
    setValue(`items.${idx}.unit`, template.unit, { shouldValidate: true });
    setValue(`items.${idx}.unitPrice`, template.unitPrice, { shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Dòng {idx + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Chọn hạng mục mẫu</Label>
        <Select value={selectedTemplateId} onValueChange={applyTemplate}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn hạng mục mẫu">
              {(value) =>
                value ? getQuotationItemTemplateLabel(value, panelWattageW) ?? null : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {inventoryItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Chọn vật tư từ kho</Label>
          <Controller
            control={control}
            name={`items.${idx}.inventoryItemId`}
            render={({ field }) => (
              <Select
                value={field.value ?? '__none__'}
                onValueChange={(value) => {
                  const nextValue = value === '__none__' ? null : value;
                  field.onChange(nextValue);
                  applyInventoryItem(nextValue);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Không gắn vật tư kho">
                    {(value) => {
                      if (!value || value === '__none__') return 'Không gắn vật tư kho';
                      const item = inventoryItems.find((option) => option.id === value);
                      return item ? `${item.sku} - ${item.name}` : 'Không gắn vật tư kho';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Không gắn vật tư kho</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                      {item.specification ? ` (${item.specification})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Dùng cho vật tư chính để báo giá lấy đúng quy cách/ảnh từ kho.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">
          Tên sản phẩm / dịch vụ <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="vd: Tấm pin năng lượng mặt trời 550W"
          {...register(`items.${idx}.productName`)}
          aria-invalid={Boolean(itemErrors?.productName)}
        />
        <FieldError message={itemErrors?.productName?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Mô tả</Label>
        <Input
          placeholder="Thông số kỹ thuật, model..."
          {...register(`items.${idx}.description`)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Số lượng <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="VD: 30"
            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
            aria-invalid={Boolean(itemErrors?.quantity)}
          />
          <FieldError message={itemErrors?.quantity?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Đơn vị tính <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name={`items.${idx}.unit`}
            render={({ field }) => (
              <>
                <Select
                  value={unitSelectValue}
                  onValueChange={(value) => {
                    if (value === QUOTATION_ITEM_UNIT_CUSTOM) {
                      if (isPresetUnit(field.value)) {
                        field.onChange('');
                      }
                      return;
                    }
                    field.onChange(value);
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(itemErrors?.unit)}>
                    <SelectValue placeholder="VD: tấm" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTATION_ITEM_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit === QUOTATION_ITEM_UNIT_CUSTOM ? 'Khác...' : unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCustomUnit && (
                  <Input
                    placeholder="VD: tấm"
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value)}
                    aria-invalid={Boolean(itemErrors?.unit)}
                  />
                )}
              </>
            )}
          />
          <FieldError message={itemErrors?.unit?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">
          Đơn giá (₫) <span className="text-destructive">*</span>
        </Label>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="VD: 2.500.000"
          {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
          aria-invalid={Boolean(itemErrors?.unitPrice)}
        />
        <FieldError message={itemErrors?.unitPrice?.message} />
        {unitPrice === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Chưa có đơn giá nên thành tiền bằng 0.
          </p>
        )}
      </div>

      <div className="text-right text-xs text-muted-foreground">
        Thành tiền:{' '}
        <span className="font-medium tabular-nums text-foreground">
          {formatCurrency(lineTotal)}
        </span>
      </div>
    </div>
  );
}
