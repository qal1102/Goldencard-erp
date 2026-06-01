'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, SparklesIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  VAT_PRESETS,
  type CreateQuotationInput,
  type DiscountType,
  type UpdateQuotationInput,
  updateQuotationSchema,
} from '../schema/quotation.schema';
import {
  generateQuotationItemsFromSurvey,
  parseSurveyTechnicalForQuotation,
  type SurveyTechnicalSource,
} from '../lib/generate-quotation-items';
import { useCreateQuotation, useUpdateQuotation } from '../hooks/use-quotations';
import { SurveyTechnicalSummary } from './survey-technical-summary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SurveyContext = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  technical: SurveyTechnicalSource;
};

type ItemRow = {
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

type CreateProps = {
  mode: 'create';
  survey: SurveyContext;
};

type EditProps = {
  mode: 'edit';
  quotationId: string;
  survey: SurveyContext;
  defaultValues: Omit<UpdateQuotationInput, 'items'> & { items: ItemRow[] };
};

type Props = CreateProps | EditProps;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

const defaultItem: ItemRow = {
  productName: '',
  description: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
};

const today = new Date().toISOString().split('T')[0]!;

type VatPresetKey = '0' | '8' | '10' | 'custom';

function initVatPreset(vatRate: number): VatPresetKey {
  if (VAT_PRESETS.includes(vatRate as (typeof VAT_PRESETS)[number])) {
    return String(vatRate) as '0' | '8' | '10';
  }
  return 'custom';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuotationForm(props: Props) {
  const { survey } = props;

  const createMutation = useCreateQuotation();
  const updateMutation = useUpdateQuotation(
    props.mode === 'edit' ? props.quotationId : '',
  );
  const mutation = props.mode === 'create' ? createMutation : updateMutation;

  const formDefaults: UpdateQuotationInput =
    props.mode === 'edit'
      ? props.defaultValues
      : {
          validUntil: '',
          note: '',
          discountType: 'amount',
          discountValue: 0,
          vatRate: 10,
          items: [{ ...defaultItem }],
        };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UpdateQuotationInput>({
    resolver: zodResolver(updateQuotationSchema),
    defaultValues: formDefaults,
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });

  const parsedTechnical = useMemo(
    () => parseSurveyTechnicalForQuotation(survey.technical),
    [survey.technical],
  );

  // Watchers
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedDiscountType = useWatch({ control, name: 'discountType' });
  const watchedDiscountValue = useWatch({ control, name: 'discountValue' });
  const watchedVatRate = useWatch({ control, name: 'vatRate' });

  const handleGenerateFromSurvey = () => {
    if (!parsedTechnical) {
      alert(
        'Khảo sát chưa có đủ dữ liệu kỹ thuật (công suất hệ thống hoặc số tấm pin) để tạo hạng mục.',
      );
      return;
    }

    const currentItems = getValues('items');
    const hasExistingContent = currentItems.some(
      (item) =>
        item.productName?.trim() ||
        item.description?.trim() ||
        (Number(item.unitPrice) || 0) > 0,
    );

    if (
      hasExistingContent &&
      !window.confirm(
        'Thao tác này sẽ thay thế toàn bộ hạng mục hiện tại bằng danh sách tạo từ khảo sát. Tiếp tục?',
      )
    ) {
      return;
    }

    replace(generateQuotationItemsFromSurvey(parsedTechnical));
  };

  // VAT preset local state — 'custom' means show a free-text number input
  const [vatPreset, setVatPreset] = useState<VatPresetKey>(() =>
    initVatPreset(formDefaults.vatRate),
  );

  // Client-side preview (for UX only — server always recomputes)
  const preview = useMemo(() => {
    const subtotal = (watchedItems ?? []).reduce((sum, item) => {
      const qty = Number(item?.quantity) || 0;
      const price = Number(item?.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const dv = Number(watchedDiscountValue) || 0;
    const discountAmount =
      watchedDiscountType === 'percent'
        ? (subtotal * dv) / 100
        : Math.min(dv, subtotal);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * (Number(watchedVatRate) || 0)) / 100;
    const grandTotal = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal };
  }, [watchedItems, watchedDiscountType, watchedDiscountValue, watchedVatRate]);

  const pending = isSubmitting || mutation.isPending;

  const onSubmit = async (data: UpdateQuotationInput) => {
    if (props.mode === 'create') {
      const payload: CreateQuotationInput = { ...data, surveyId: survey.id };
      const result = await createMutation.mutateAsync(payload);
      if (!result.success) alert(result.error);
    } else {
      const result = await updateMutation.mutateAsync(data);
      if (!result.success) alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Customer & survey info (read-only preview) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{survey.customerName}</p>
          {survey.customerPhone && (
            <p className="text-muted-foreground">{survey.customerPhone}</p>
          )}
          {survey.customerAddress && (
            <p className="text-xs text-muted-foreground">{survey.customerAddress}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Khảo sát:{' '}
            <span className="font-mono font-medium text-foreground">{survey.code}</span>
          </p>
        </CardContent>
      </Card>

      <SurveyTechnicalSummary survey={survey.technical} />

      {/* Line items */}
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-sm">
            Hạng mục báo giá <span className="text-destructive">*</span>
          </CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleGenerateFromSurvey}
            disabled={!parsedTechnical}
          >
            <SparklesIcon className="size-3.5" />
            Tạo nhanh từ khảo sát
          </Button>
          {!parsedTechnical && (
            <p className="text-xs text-muted-foreground">
              Cần có công suất hệ thống hoặc số tấm pin trên phiếu khảo sát để tạo hạng mục tự
              động.
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.items?.root && (
            <FieldError message={errors.items.root.message} />
          )}
          {errors.items?.message && (
            <FieldError message={errors.items.message} />
          )}

          {fields.map((field, idx) => {
            const itemErrors = errors.items?.[idx];
            return (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Dòng {idx + 1}
                  </span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  )}
                </div>

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
                      placeholder="1"
                      {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                      aria-invalid={Boolean(itemErrors?.quantity)}
                    />
                    <FieldError message={itemErrors?.quantity?.message} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">
                      Đơn vị <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="tấm, bộ, m, m²..."
                      {...register(`items.${idx}.unit`)}
                      aria-invalid={Boolean(itemErrors?.unit)}
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
                    placeholder="0"
                    {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                    aria-invalid={Boolean(itemErrors?.unitPrice)}
                  />
                  <FieldError message={itemErrors?.unitPrice?.message} />
                </div>

                {/* Per-item line total preview */}
                <div className="text-right text-xs text-muted-foreground">
                  Thành tiền:{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(
                      (Number(watchedItems?.[idx]?.quantity) || 0) *
                        (Number(watchedItems?.[idx]?.unitPrice) || 0),
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...defaultItem })}
            className="w-full"
          >
            <PlusIcon className="size-3.5" />
            Thêm dòng hàng
          </Button>
        </CardContent>
      </Card>

      {/* Financials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chiết khấu &amp; Thuế</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* --- Discount type toggle --- */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Loại chiết khấu</Label>
            <div className="flex gap-1">
              {(
                [
                  { value: 'amount', label: 'Số tiền (₫)' },
                  { value: 'percent', label: 'Phần trăm (%)' },
                ] as { value: DiscountType; label: string }[]
              ).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={watchedDiscountType === value ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setValue('discountType', value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* --- Discount value --- */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qf-discount-value" className="text-xs">
              {watchedDiscountType === 'percent'
                ? 'Tỷ lệ chiết khấu (%)'
                : 'Số tiền chiết khấu (₫)'}
            </Label>
            <Input
              id="qf-discount-value"
              type="number"
              inputMode="decimal"
              min="0"
              max={watchedDiscountType === 'percent' ? 100 : undefined}
              step="any"
              placeholder="0"
              {...register('discountValue', { valueAsNumber: true })}
              aria-invalid={Boolean(errors.discountValue)}
            />
            <FieldError message={errors.discountValue?.message} />
          </div>

          <Separator />

          {/* --- VAT rate preset buttons --- */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Thuế VAT</Label>
            <div className="flex gap-1">
              {(['0', '8', '10'] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={vatPreset === p ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setVatPreset(p);
                    setValue('vatRate', Number(p));
                  }}
                >
                  {p}%
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={vatPreset === 'custom' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setVatPreset('custom')}
              >
                Khác
              </Button>
            </div>
          </div>

          {/* --- Custom VAT rate input (shown only when 'Khác' is selected) --- */}
          {vatPreset === 'custom' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qf-vat-custom" className="text-xs">
                Tỷ lệ VAT tùy chỉnh (%)
              </Label>
              <Input
                id="qf-vat-custom"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="0"
                {...register('vatRate', { valueAsNumber: true })}
                aria-invalid={Boolean(errors.vatRate)}
              />
              <FieldError message={errors.vatRate?.message} />
            </div>
          )}

          <Separator />

          {/* --- Totals preview (client-side for UX; server recomputes) --- */}
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Tạm tính</span>
              <span className="tabular-nums">{formatCurrency(preview.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                Chiết khấu
                {watchedDiscountType === 'percent' &&
                  ` (${Number(watchedDiscountValue) || 0}%)`}
              </span>
              <span className="tabular-nums">
                -{formatCurrency(preview.discountAmount)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Sau chiết khấu</span>
              <span className="tabular-nums">
                {formatCurrency(preview.taxableAmount)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Thuế VAT ({Number(watchedVatRate) || 0}%)</span>
              <span className="tabular-nums">
                +{formatCurrency(preview.taxAmount)}
              </span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng</span>
              <span className="tabular-nums">{formatCurrency(preview.grandTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * Tổng tiền hiển thị để tham khảo. Hệ thống sẽ tính lại khi lưu.
          </p>
        </CardContent>
      </Card>

      {/* Additional info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin thêm</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qf-validUntil">Hiệu lực đến</Label>
            <Input
              id="qf-validUntil"
              type="date"
              min={today}
              {...register('validUntil')}
              aria-invalid={Boolean(errors.validUntil)}
            />
            <FieldError message={errors.validUntil?.message} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qf-note">Ghi chú</Label>
            <Textarea
              id="qf-note"
              rows={3}
              placeholder="Điều khoản thanh toán, bảo hành, ghi chú thêm..."
              {...register('note')}
              aria-invalid={Boolean(errors.note)}
            />
            <FieldError message={errors.note?.message} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? 'Đang lưu...'
          : props.mode === 'create'
            ? 'Tạo báo giá'
            : 'Lưu thay đổi'}
      </Button>
    </form>
  );
}
