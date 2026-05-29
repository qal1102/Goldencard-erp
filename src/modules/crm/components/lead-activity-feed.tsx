'use client';

import { ArrowRightCircleIcon, MessageSquareIcon, PhoneIcon, RefreshCwIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { LeadActivity } from '@/db/schema';
import { useAddLeadNote, useLeadActivities } from '../hooks/use-leads';
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '../schema/lead.schema';

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  note: <MessageSquareIcon className="size-3.5" />,
  call: <PhoneIcon className="size-3.5" />,
  status_change: <RefreshCwIcon className="size-3.5" />,
  assignment_change: <UserIcon className="size-3.5" />,
  conversion: <ArrowRightCircleIcon className="size-3.5" />,
};

type ActivityWithUser = LeadActivity & {
  createdByUser: { id: string; name: string };
};

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  leadId: string;
};

export function LeadActivityFeed({ leadId }: Props) {
  const { data: activities, isLoading } = useLeadActivities(leadId);
  const addNote = useAddLeadNote(leadId);

  const [content, setContent] = useState('');
  const [type, setType] = useState<'note' | 'call'>('note');
  const [contentError, setContentError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setContentError('Nội dung không được trống');
      return;
    }

    const result = await addNote.mutateAsync({ content: content.trim(), type });
    if (result.success) {
      setContent('');
      setContentError('');
    }
  };

  const activitiesTyped = (activities ?? []) as ActivityWithUser[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Lịch sử hoạt động</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as 'note' | 'call')}>
              <SelectTrigger className="w-[130px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Ghi chú</SelectItem>
                <SelectItem value="call">Cuộc gọi</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-1 flex-col gap-1">
              <Textarea
                placeholder="Nhập nội dung..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setContentError('');
                }}
                rows={2}
                aria-invalid={Boolean(contentError)}
              />
              {contentError && <p className="text-xs text-destructive">{contentError}</p>}
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={addNote.isPending}
          >
            {addNote.isPending ? 'Đang lưu...' : 'Thêm'}
          </Button>
        </form>

        <div className="flex flex-col gap-3">
          {isLoading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}

          {!isLoading && activitiesTyped.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">Chưa có hoạt động</p>
          )}

          {activitiesTyped.map((activity) => (
            <div key={activity.id} className="flex gap-2.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/5">
                {ACTIVITY_ICONS[activity.type as ActivityType] ?? ACTIVITY_ICONS.note}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-medium">
                    {ACTIVITY_TYPE_LABELS[activity.type as ActivityType] ?? activity.type}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.content}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  {activity.createdByUser.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
