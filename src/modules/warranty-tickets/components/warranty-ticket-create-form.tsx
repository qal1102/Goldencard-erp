'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  WARRANTY_TICKET_PRIORITIES,
  WARRANTY_TICKET_PRIORITY_LABELS,
  type CreateWarrantyTicketInput,
  type WarrantyTicketPriority,
} from '../schema/warranty-ticket.schema';
import { useCreateWarrantyTicket, useWarrantyAssignableUsers } from '../hooks/use-warranty-tickets';

export type WarrantyTicketCreatePrefill = {
  customerId: string;
  customerLabel?: string;
  leadId?: string | null;
  surveyId?: string | null;
  quotationId?: string | null;
  contractId?: string | null;
  workOrderId?: string | null;
  handoverId?: string | null;
  customerContactName?: string | null;
  customerContactPhone?: string | null;
};

type Props = {
  prefill: WarrantyTicketCreatePrefill;
  cancelHref?: string;
  contextNote?: string;
};

const INTAKE_SOURCES = [
  { value: 'hotline', label: 'Hotline' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'direct', label: 'Khách liên hệ trực tiếp' },
  { value: 'staff', label: 'Nhân viên ghi nhận' },
  { value: 'other', label: 'Khác' },
] as const;

const ISSUE_GROUPS = [
  { value: 'system_down', label: 'Hệ thống không phát điện' },
  { value: 'low_output', label: 'Sản lượng thấp' },
  { value: 'inverter', label: 'Inverter / cảnh báo lỗi' },
  { value: 'panel', label: 'Tấm pin / khung giàn' },
  { value: 'monitoring', label: 'App monitoring / mất kết nối' },
  { value: 'maintenance', label: 'Kiểm tra / bảo trì định kỳ' },
  { value: 'other', label: 'Khác' },
] as const;

type IntakeSource = (typeof INTAKE_SOURCES)[number]['value'];
type IssueGroup = (typeof ISSUE_GROUPS)[number]['value'];

function buildIssueDescription(input: {
  contextNote?: string;
  source: IntakeSource;
  issueGroup: IssueGroup;
  visitPreference: string;
  description: string;
}) {
  const sourceLabel =
    INTAKE_SOURCES.find((item) => item.value === input.source)?.label ?? input.source;
  const groupLabel =
    ISSUE_GROUPS.find((item) => item.value === input.issueGroup)?.label ?? input.issueGroup;
  const lines = [
    input.contextNote ? `[Ngữ cảnh] ${input.contextNote}` : null,
    `[Nguồn tiếp nhận] ${sourceLabel}`,
    `[Nhóm lỗi] ${groupLabel}`,
    input.visitPreference.trim() ? `[Lịch hẹn mong muốn] ${input.visitPreference.trim()}` : null,
    input.description.trim(),
  ].filter(Boolean);

  return lines.join('\n\n') || null;
}

export function WarrantyTicketCreateForm({
  prefill,
  cancelHref = '/warranty',
  contextNote,
}: Props) {
  const router = useRouter();
  const createTicket = useCreateWarrantyTicket();
  const { data: assignableUsers } = useWarrantyAssignableUsers();

  const [priority, setPriority] = useState<WarrantyTicketPriority>('normal');
  const [intakeSource, setIntakeSource] = useState<IntakeSource>('hotline');
  const [issueGroup, setIssueGroup] = useState<IssueGroup>('other');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [visitPreference, setVisitPreference] = useState('');
  const [customerContactName, setCustomerContactName] = useState(
    prefill.customerContactName ?? '',
  );
  const [customerContactPhone, setCustomerContactPhone] = useState(
    prefill.customerContactPhone ?? '',
  );
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPending = createTicket.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CreateWarrantyTicketInput = {
      customerId: prefill.customerId,
      leadId: prefill.leadId ?? null,
      surveyId: prefill.surveyId ?? null,
      quotationId: prefill.quotationId ?? null,
      contractId: prefill.contractId ?? null,
      workOrderId: prefill.workOrderId ?? null,
      handoverId: prefill.handoverId ?? null,
      priority,
      issueTitle: issueTitle.trim(),
      issueDescription: buildIssueDescription({
        contextNote,
        source: intakeSource,
        issueGroup,
        visitPreference,
        description: issueDescription,
      }),
      customerContactName: customerContactName.trim() || null,
      customerContactPhone: customerContactPhone.trim() || null,
      assignedTo: assignedTo || null,
    };

    const result = await createTicket.mutateAsync(payload);
    if (!result.success) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {prefill.customerLabel && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            Khách hàng: <span className="font-medium text-foreground">{prefill.customerLabel}</span>
          </p>
          {contextNote && <p className="mt-1 text-xs text-muted-foreground">{contextNote}</p>}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="issueTitle">Tiêu đề yêu cầu *</Label>
        <Input
          id="issueTitle"
          value={issueTitle}
          onChange={(e) => setIssueTitle(e.target.value)}
          required
          maxLength={255}
          placeholder="VD: Inverter báo lỗi, hệ thống không phát điện..."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="intakeSource">Nguồn tiếp nhận</Label>
          <Select
            value={intakeSource}
            onValueChange={(value) => {
              if (value) setIntakeSource(value as IntakeSource);
            }}
          >
            <SelectTrigger id="intakeSource" className="w-full">
              <SelectValue>
                {INTAKE_SOURCES.find((item) => item.value === intakeSource)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {INTAKE_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issueGroup">Nhóm lỗi</Label>
          <Select
            value={issueGroup}
            onValueChange={(value) => {
              if (value) setIssueGroup(value as IssueGroup);
            }}
          >
            <SelectTrigger id="issueGroup" className="w-full">
              <SelectValue>
                {ISSUE_GROUPS.find((item) => item.value === issueGroup)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ISSUE_GROUPS.map((group) => (
                <SelectItem key={group.value} value={group.value}>
                  {group.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="priority">Mức ưu tiên</Label>
        <Select
          value={priority}
          onValueChange={(value) => {
            if (value) setPriority(value as WarrantyTicketPriority);
          }}
        >
          <SelectTrigger id="priority" className="w-full">
            <SelectValue>{WARRANTY_TICKET_PRIORITY_LABELS[priority]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WARRANTY_TICKET_PRIORITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {WARRANTY_TICKET_PRIORITY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="issueDescription">Mô tả chi tiết</Label>
        <Textarea
          id="issueDescription"
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          rows={4}
          placeholder="Triệu chứng, thời điểm phát sinh, yêu cầu khách hàng..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="visitPreference">Lịch hẹn mong muốn</Label>
        <Input
          id="visitPreference"
          value={visitPreference}
          onChange={(e) => setVisitPreference(e.target.value)}
          maxLength={255}
          placeholder="VD: Sáng mai, sau 17h, ưu tiên cuối tuần..."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerContactName">Người liên hệ</Label>
          <Input
            id="customerContactName"
            value={customerContactName}
            onChange={(e) => setCustomerContactName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerContactPhone">Số điện thoại</Label>
          <Input
            id="customerContactPhone"
            value={customerContactPhone}
            onChange={(e) => setCustomerContactPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assignedTo">Phân công xử lý</Label>
        <Select
          value={assignedTo || '__none__'}
          onValueChange={(value) => setAssignedTo(!value || value === '__none__' ? '' : value)}
        >
          <SelectTrigger id="assignedTo" className="w-full">
            <SelectValue placeholder="Chưa phân công">
              {(value) => {
                if (!value || value === '__none__') return 'Chưa phân công';
                return assignableUsers?.find((user) => user.id === value)?.name ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Chưa phân công</SelectItem>
            {(assignableUsers ?? []).map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || !issueTitle.trim()}>
          {isPending ? 'Đang tạo...' : 'Tạo yêu cầu'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.replace(cancelHref)}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
