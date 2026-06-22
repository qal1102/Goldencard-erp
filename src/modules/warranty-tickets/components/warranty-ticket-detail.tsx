'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DocumentLinksList } from '@/components/document-links-list';
import { BackButton } from '@/components/navigation/back-button';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { displayQuotationCode } from '@/modules/quotations/lib/quotation-display';
import {
  WARRANTY_TICKET_STATUS_LABELS,
  WARRANTY_TICKET_STATUS_TRANSITIONS,
  type WarrantyTicketStatus,
} from '../schema/warranty-ticket.schema';
import {
  useResolveWarrantyTicket,
  useUpdateWarrantyTicketAssignment,
  useUpdateWarrantyTicketStatus,
  useWarrantyAssignableUsers,
  useWarrantyTicket,
} from '../hooks/use-warranty-tickets';
import { WarrantyTicketPriorityBadge } from './warranty-ticket-priority-badge';
import { WarrantyTicketStatusBadge } from './warranty-ticket-status-badge';

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-sm">{value}</span>
    </div>
  );
}

type Props = {
  ticketId: string;
  canWrite: boolean;
};

export function WarrantyTicketDetail({ ticketId, canWrite }: Props) {
  const { data: ticket, isLoading } = useWarrantyTicket(ticketId);
  const { data: assignableUsers } = useWarrantyAssignableUsers();
  const updateAssignment = useUpdateWarrantyTicketAssignment(ticketId);
  const updateStatus = useUpdateWarrantyTicketStatus(ticketId);
  const resolveTicket = useResolveWarrantyTicket(ticketId);
  const [error, setError] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionLinks, setResolutionLinks] = useState('');

  type AssignmentDraft = { assignedTo: string; scheduledAt: string };
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Không tìm thấy yêu cầu bảo hành
      </div>
    );
  }

  const status = ticket.status as WarrantyTicketStatus;
  const allowedTransitions = WARRANTY_TICKET_STATUS_TRANSITIONS[status] ?? [];
  const canEdit = canWrite && status !== 'resolved' && status !== 'cancelled';

  const savedAssignment: AssignmentDraft = {
    assignedTo: ticket.assignedTo ?? '',
    scheduledAt: formatDateInput(ticket.scheduledAt),
  };
  const assignmentValues = assignmentDraft ?? savedAssignment;
  const assignmentDirty = assignmentDraft !== null;

  async function handleStatus(next: WarrantyTicketStatus) {
    setError(null);
    const result = await updateStatus.mutateAsync({ status: next });
    if (!result.success) setError(result.error);
  }

  async function handleSaveAssignment() {
    setError(null);
    const result = await updateAssignment.mutateAsync({
      assignedTo: assignmentValues.assignedTo || null,
      scheduledAt: parseDateInput(assignmentValues.scheduledAt),
    });
    if (result.success) setAssignmentDraft(null);
    else setError(result.error);
  }

  async function handleResolve() {
    setError(null);
    const result = await resolveTicket.mutateAsync({
      resolutionNote: resolutionNote.trim(),
      documentLinks: resolutionLinks.trim() || null,
    });
    if (result.success) {
      setShowResolve(false);
      setResolutionNote('');
      setResolutionLinks('');
    } else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/warranty" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">{ticket.code}</h1>
            <WarrantyTicketStatusBadge status={status} />
            <WarrantyTicketPriorityBadge priority={ticket.priority} />
          </div>
          {ticket.customer && (
            <Link
              href={`/crm/customers/${ticket.customer.id}`}
              className="mt-1 block text-sm font-medium text-primary hover:underline"
            >
              {ticket.customer.fullName}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {canEdit && (allowedTransitions.length > 0 || !showResolve) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Thao tác</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.includes('assigned') && status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('assigned')}
                >
                  Đánh dấu đã phân công
                </Button>
              )}
              {allowedTransitions.includes('scheduled') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('scheduled')}
                >
                  Đánh dấu đã hẹn
                </Button>
              )}
              {allowedTransitions.includes('in_progress') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('in_progress')}
                >
                  Bắt đầu xử lý
                </Button>
              )}
              {allowedTransitions.includes('resolved') && !showResolve && (
                <Button size="sm" onClick={() => setShowResolve(true)}>
                  Hoàn tất xử lý
                </Button>
              )}
              {allowedTransitions.includes('cancelled') && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus('cancelled')}
                >
                  Hủy yêu cầu
                </Button>
              )}
            </div>

            {showResolve && (
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <Label htmlFor="resolutionNote">Ghi chú xử lý *</Label>
                <Textarea
                  id="resolutionNote"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                />
                <Label htmlFor="resolutionLinks">Link ảnh/tài liệu</Label>
                <Textarea
                  id="resolutionLinks"
                  value={resolutionLinks}
                  onChange={(e) => setResolutionLinks(e.target.value)}
                  rows={3}
                  placeholder="Mỗi dòng một link"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={resolveTicket.isPending || !resolutionNote.trim()}
                    onClick={handleResolve}
                  >
                    Xác nhận hoàn tất
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowResolve(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liên hệ khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Số điện thoại" value={ticket.customerContactPhone ?? ticket.customer?.phone} />
          <DetailRow label="Người liên hệ" value={ticket.customerContactName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nội dung yêu cầu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Tiêu đề" value={ticket.issueTitle} />
          <DetailRow label="Mô tả" value={ticket.issueDescription} />
          <DetailRow label="Tiếp nhận lúc" value={formatDateTime(ticket.reportedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dự án liên quan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {ticket.customer && (
            <div>
              <Label className="text-xs text-muted-foreground">Khách hàng</Label>
              <Link href={`/crm/customers/${ticket.customer.id}`} className="block font-mono text-primary hover:underline">
                {ticket.customer.code} · {ticket.customer.fullName}
              </Link>
            </div>
          )}
          {ticket.lead && (
            <div>
              <Label className="text-xs text-muted-foreground">Cơ hội</Label>
              <Link href={`/crm/leads/${ticket.lead.id}`} className="block font-mono text-primary hover:underline">
                {ticket.lead.code}
              </Link>
            </div>
          )}
          {ticket.survey && (
            <div>
              <Label className="text-xs text-muted-foreground">Khảo sát</Label>
              <Link href={`/surveys/${ticket.survey.id}`} className="block font-mono text-primary hover:underline">
                {ticket.survey.code}
              </Link>
            </div>
          )}
          {ticket.quotation && (
            <div>
              <Label className="text-xs text-muted-foreground">Báo giá</Label>
              <Link href={`/quotations/${ticket.quotation.id}`} className="block font-mono text-primary hover:underline">
                {displayQuotationCode(ticket.quotation.code)}
              </Link>
            </div>
          )}
          {ticket.contract && (
            <div>
              <Label className="text-xs text-muted-foreground">Hợp đồng</Label>
              <Link href={`/contracts/${ticket.contract.id}`} className="block font-mono text-primary hover:underline">
                {ticket.contract.code}
              </Link>
            </div>
          )}
          {ticket.workOrder && (
            <div>
              <Label className="text-xs text-muted-foreground">Lệnh thi công</Label>
              <Link href={`/work-orders/${ticket.workOrder.id}`} className="block font-mono text-primary hover:underline">
                {ticket.workOrder.code}
              </Link>
            </div>
          )}
          {ticket.handover && (
            <div>
              <Label className="text-xs text-muted-foreground">Bàn giao</Label>
              <Link href={`/handovers/${ticket.handover.id}`} className="block font-mono text-primary hover:underline">
                {ticket.handover.code}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phân công & lịch hẹn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canEdit ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Người xử lý</Label>
                <Select
                  value={assignmentValues.assignedTo || '__none__'}
                  onValueChange={(v) =>
                    setAssignmentDraft({
                      ...(assignmentDraft ?? savedAssignment),
                      assignedTo: !v || v === '__none__' ? '' : v,
                    })
                  }
                >
                  <SelectTrigger>
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduledAt">Lịch hẹn xử lý</Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={assignmentValues.scheduledAt}
                  onChange={(e) =>
                    setAssignmentDraft({
                      ...(assignmentDraft ?? savedAssignment),
                      scheduledAt: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={!assignmentDirty || updateAssignment.isPending}
                onClick={handleSaveAssignment}
              >
                Lưu phân công
              </Button>
            </>
          ) : (
            <>
              <DetailRow label="Người xử lý" value={ticket.assignedUser?.name ?? '—'} />
              <DetailRow label="Lịch hẹn" value={formatDateTime(ticket.scheduledAt) ?? '—'} />
            </>
          )}
        </CardContent>
      </Card>

      {(ticket.resolutionNote || ticket.documentLinks || status === 'resolved') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kết quả xử lý</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label="Ghi chú xử lý" value={ticket.resolutionNote} />
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs text-muted-foreground">Link tài liệu</Label>
              <DocumentLinksList value={ticket.documentLinks} />
            </div>
            <DetailRow label="Hoàn tất lúc" value={formatDateTime(ticket.resolvedAt)} />
            <DetailRow label="Người xử lý xong" value={ticket.resolvedByUser?.name} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DetailRow label="Trạng thái" value={WARRANTY_TICKET_STATUS_LABELS[status]} />
          <DetailRow label="Tạo bởi" value={ticket.createdByUser?.name} />
          <DetailRow label="Tạo lúc" value={formatDateTime(ticket.createdAt)} />
        </CardContent>
      </Card>
    </div>
  );
}
