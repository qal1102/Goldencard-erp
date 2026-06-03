'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { SurveyPhotoLinks } from '@/modules/surveys/components/survey-photo-links';
import {
  VAT_PRESETS,
  type CreateQuotationInput,
  type DiscountType,
  type UpdateQuotationInput,
  updateQuotationSchema,
} from '../schema/quotation.schema';
import {
  generateQuotationItemsFromSurvey,
  getQuickGenerateStatus,
  parseSurveyTechnicalForQuotation,
  type SurveyTechnicalSource,
} from '../lib/generate-quotation-items';
import { QuotationItemRow } from './quotation-item-row';
import { QuickGenerateStatusPanel } from './quick-generate-status-panel';
import { useCreateQuotation, useUpdateQuotation } from '../hooks/use-quotations';
import { LeadConsultationContextCard } from '@/modules/crm/components/lead-consultation-context-card';
import type { LeadConsultationContext } from '@/modules/crm/schema/lead.schema';
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
  photosNote?: string | null;
  leadConsultation?: LeadConsultationContext | null;
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
  isSentEdit?: boolean;
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

  const quickGenerateStatus = useMemo(
    () => getQuickGenerateStatus(survey.technical),
    [survey.technical],
  );

  const panelWattageW =
    parsedTechnical?.panelWattageW ??
    survey.technical.zones?.[0]?.panelWattageW ??
    survey.technical.panelWattageW ??
    550;

  // Watchers
  const watchedItems = useWatch({ control, name: 'items' });
  const watchedDiscountType = useWatch({ control, name: 'discountType' });
  const watchedDiscountValue = useWatch({ control, name: 'discountValue' });
  const watchedVatRate = useWatch({ control, name: 'vatRate' });

  const handleGenerateFromSurvey = () => {
    if (!quickGenerateStatus.canGenerate || !parsedTechnical) {
      alert(
        quickGenerateStatus.reason ??
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
  const isSentEdit = props.mode === 'edit' && props.isSentEdit;

  const onSubmit = async (data: UpdateQuotationInput) => {
    if (props.mode === 'create') {
      const payload: CreateQuotationInput = { ...data, surveyId: survey.id };
      const result = await createMutation.mutateAsync(payload);
      if (!result.success) alert(result.error);
    } else {
      if (isSentEdit && !data.editNote?.trim()) {
        alert('Vui lòng nhập ghi chú tóm tắt thay đổi');
        return;
      }
      const result = await updateMutation.mutateAsync(data);
      if (!result.success) alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {isSentEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Báo giá đã gửi cho khách
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            Nếu sửa, cần xuất và gửi lại bản mới. Trạng thái vẫn giữ là &quot;Đã gửi cho khách&quot;.
          </p>
        </div>
      )}
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

      {survey.leadConsultation && (
        <LeadConsultationContextCard
          consultation={survey.leadConsultation}
          title="Nhu cầu khách hàng (từ Lead)"
        />
      )}

      <SurveyTechnicalSummary survey={survey.technical} />

      {survey.photosNote?.trim() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Link ảnh/tài liệu khảo sát</CardTitle>
          </CardHeader>
          <CardContent>
            <SurveyPhotoLinks value={survey.photosNote} />
          </CardContent>
        </Card>
      )}

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
            disabled={!quickGenerateStatus.canGenerate}
          >
            <SparklesIcon className="size-3.5" />
            Tạo nhanh từ khảo sát
          </Button>
          <QuickGenerateStatusPanel status={quickGenerateStatus} surveyId={survey.id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.items?.root && (
            <FieldError message={errors.items.root.message} />
          )}
          {errors.items?.message && (
            <FieldError message={errors.items.message} />
          )}

          {fields.map((field, idx) => (
            <QuotationItemRow
              key={field.id}
              idx={idx}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors.items?.[idx]}
              unitValue={watchedItems?.[idx]?.unit ?? ''}
              unitPrice={Number(watchedItems?.[idx]?.unitPrice) || 0}
              lineTotal={
                (Number(watchedItems?.[idx]?.quantity) || 0) *
                (Number(watchedItems?.[idx]?.unitPrice) || 0)
              }
              panelWattageW={panelWattageW}
              canRemove={fields.length > 1}
              onRemove={() => remove(idx)}
              formatCurrency={formatCurrency}
            />
          ))}

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

      {isSentEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Ghi chú thay đổi <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <Textarea
              id="qf-edit-note"
              rows={3}
              placeholder="Mô tả ngắn gọn nội dung đã thay đổi (ít nhất 5 ký tự)..."
              {...register('editNote')}
              aria-invalid={Boolean(errors.editNote)}
            />
            <FieldError message={errors.editNote?.message} />
          </CardContent>
        </Card>
      )}

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
