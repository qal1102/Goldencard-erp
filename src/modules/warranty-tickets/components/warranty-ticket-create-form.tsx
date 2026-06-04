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
};

export function WarrantyTicketCreateForm({ prefill, cancelHref = '/warranty' }: Props) {
  const router = useRouter();
  const createTicket = useCreateWarrantyTicket();
  const { data: assignableUsers } = useWarrantyAssignableUsers();

  const [priority, setPriority] = useState<WarrantyTicketPriority>('normal');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
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
      issueDescription: issueDescription.trim() || null,
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
        <p className="text-sm text-muted-foreground">
          Khách hàng: <span className="font-medium text-foreground">{prefill.customerLabel}</span>
        </p>
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="priority">Mức ưu tiên</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as WarrantyTicketPriority)}>
          <SelectTrigger id="priority">
            <SelectValue>{WARRANTY_TICKET_PRIORITY_LABELS[priority]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WARRANTY_TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {WARRANTY_TICKET_PRIORITY_LABELS[p]}
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
        <Label htmlFor="assignedTo">Phân công xử lý (tuỳ chọn)</Label>
        <Select
          value={assignedTo || '__none__'}
          onValueChange={(v) => setAssignedTo(!v || v === '__none__' ? '' : v)}
        >
          <SelectTrigger id="assignedTo">
            <SelectValue placeholder="Chưa phân công">
              {(value) => {
                if (!value || value === '__none__') return 'Chưa phân công';
                return assignableUsers?.find((u) => u.id === value)?.name ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Chưa phân công</SelectItem>
            {(assignableUsers ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
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
          Huỷ
        </Button>
      </div>
    </form>
  );
}
