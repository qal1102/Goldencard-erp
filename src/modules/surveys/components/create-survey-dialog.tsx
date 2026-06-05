'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { addressesAreSame, hasAddress } from '@/lib/address/format-address';
import { useCreateSurvey, useTechnicianUsers } from '../hooks/use-surveys';
import { createSurveySchema } from '../schema/survey.schema';

type CustomerContext = {
  id: string;
  code: string;
  fullName: string;
  address: string;
  province?: string | null;
};

type LeadContext = {
  id: string;
  code: string;
  fullName: string;
  address: string;
  province?: string | null;
};

type FormProps = {
  customer?: CustomerContext;
  lead?: LeadContext;
  leadId?: string;
  installationAddress?: string;
  installationProvince?: string | null;
  onSuccess: () => void;
};

type Props =
  | {
      customer: CustomerContext;
      lead?: never;
      leadId?: string;
      installationAddress?: string;
      installationProvince?: string | null;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      customer?: never;
      lead: LeadContext;
      leadId?: never;
      installationAddress?: string;
      installationProvince?: string | null;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

const UNASSIGNED_TECHNICIAN_VALUE = '__unassigned__';

function resolveInstallationAddress(
  explicitAddress: string | undefined,
  explicitProvince: string | null | undefined,
  lead?: LeadContext,
  customer?: CustomerContext,
): { address: string; province: string } {
  if (explicitAddress?.trim()) {
    return { address: explicitAddress, province: explicitProvince ?? '' };
  }
  if (lead?.address?.trim()) {
    return { address: lead.address, province: lead.province ?? '' };
  }
  return { address: customer?.address ?? '', province: customer?.province ?? '' };
}

function CreateSurveyFormBody({
  customer,
  lead,
  leadId,
  installationAddress,
  installationProvince,
  onSuccess,
}: FormProps) {
  const { data: technicians } = useTechnicianUsers();
  const createSurvey = useCreateSurvey();

  const install = resolveInstallationAddress(
    installationAddress,
    installationProvince,
    lead,
    customer,
  );
  const hasInstallation = hasAddress(install.address, install.province);

  const [sameAsInstallation, setSameAsInstallation] = useState(hasInstallation);
  const [form, setForm] = useState({
    address: hasInstallation ? install.address : '',
    province: hasInstallation ? install.province : '',
    scheduledAt: '',
    assignedTo: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const handleSameAsInstallationChange = (checked: boolean) => {
    setSameAsInstallation(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        address: install.address,
        province: install.province,
      }));
    }
  };

  const surveyDiffersFromInstallation =
    hasInstallation &&
    !sameAsInstallation &&
    !addressesAreSame(form, install);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = createSurveySchema.safeParse({
      customerId: customer ? customer.id : undefined,
      leadId: customer ? (leadId || undefined) : lead?.id,
      address: form.address,
      province: form.province || undefined,
      scheduledAt: form.scheduledAt || undefined,
      assignedTo: form.assignedTo || null,
      notes: form.notes || undefined,
    });

    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!newErrors[key]) newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    const result = await createSurvey.mutateAsync(parsed.data);
    if (!result.success) {
      setServerError(result.error);
    } else {
      onSuccess();
    }
  };

  return (
    <>
      <form
        id="create-survey-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 overflow-y-auto px-4 pb-2"
      >
        {serverError && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{serverError}</p>
          </div>
        )}

        {hasInstallation && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Địa chỉ lắp đặt dự án</p>
            <p className="mt-1 text-sm">{install.address}</p>
            {install.province?.trim() && (
              <p className="text-xs text-muted-foreground">{install.province}</p>
            )}
          </div>
        )}

        {hasInstallation && (
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={sameAsInstallation}
              onChange={(e) => handleSameAsInstallationChange(e.target.checked)}
            />
            <span className="text-sm leading-snug">
              Địa chỉ khảo sát giống địa chỉ lắp đặt
            </span>
          </label>
        )}

        {surveyDiffersFromInstallation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Địa chỉ khảo sát khác địa chỉ lắp đặt. Vui lòng kiểm tra trước khi phân công kỹ
              thuật viên.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-address">
            Địa chỉ khảo sát <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cs-address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={sameAsInstallation && hasInstallation}
            aria-invalid={Boolean(errors.address)}
          />
          {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-province">Tỉnh / Thành phố</Label>
          <Input
            id="cs-province"
            value={form.province}
            onChange={(e) => handleChange('province', e.target.value)}
            disabled={sameAsInstallation && hasInstallation}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-scheduledAt">Ngày hẹn khảo sát</Label>
          <Input
            id="cs-scheduledAt"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => handleChange('scheduledAt', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-assignedTo">Phân công kỹ thuật viên</Label>
          <Select
            value={form.assignedTo || UNASSIGNED_TECHNICIAN_VALUE}
            onValueChange={(v) =>
              handleChange(
                'assignedTo',
                v === UNASSIGNED_TECHNICIAN_VALUE ? '' : v ?? '',
              )
            }
          >
            <SelectTrigger id="cs-assignedTo" className="w-full">
              <SelectValue placeholder="Chưa phân công">
                {(value) => {
                  if (value === UNASSIGNED_TECHNICIAN_VALUE) return null;
                  const tech = technicians?.find((t) => t.id === value);
                  return tech ? tech.name : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_TECHNICIAN_VALUE}>Chưa phân công</SelectItem>
              {(technicians ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-notes">Ghi chú nội bộ</Label>
          <Textarea
            id="cs-notes"
            placeholder="Thông tin cần lưu ý cho kỹ thuật viên..."
            rows={3}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>
      </form>

      <DialogFooter className="shrink-0">
        <DialogClose render={<Button variant="outline" disabled={createSurvey.isPending} />}>
          Hủy
        </DialogClose>
        <Button form="create-survey-form" type="submit" disabled={createSurvey.isPending}>
          {createSurvey.isPending ? 'Đang tạo...' : 'Tạo phiếu khảo sát'}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CreateSurveyDialog({
  customer,
  lead,
  leadId,
  installationAddress,
  installationProvince,
  open,
  onOpenChange,
}: Props) {
  const source = customer ?? lead;

  const descriptionLabel = customer
    ? `Khảo sát cho khách hàng `
    : `Khảo sát cho khách hàng tiềm năng `;
  const entityName = source?.fullName ?? '';
  const entityCode = source?.code ?? '';
  const formKey = `${customer?.id ?? lead?.id ?? 'x'}-${installationAddress ?? ''}-${leadId ?? ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-4 pb-3">
          <DialogTitle>Tạo phiếu khảo sát</DialogTitle>
          <DialogDescription>
            {descriptionLabel}
            <strong>{entityName}</strong> ({entityCode})
          </DialogDescription>
        </DialogHeader>

        {open && (
          <CreateSurveyFormBody
            key={formKey}
            customer={customer}
            lead={lead}
            leadId={leadId}
            installationAddress={installationAddress}
            installationProvince={installationProvince}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
