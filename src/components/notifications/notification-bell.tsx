'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BellIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { NotificationRow } from '@/lib/notifications/types';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/lib/notifications/hooks/use-notifications';
import { cn } from '@/lib/utils';

function formatDateTime(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: NotificationRow;
  onOpen: (notification: NotificationRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        'w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        notification.isRead
          ? 'border-transparent bg-transparent'
          : 'border-primary/15 bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-foreground">{notification.title}</p>
        {!notification.isRead && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            Chưa đọc
          </Badge>
        )}
      </div>
      {notification.body && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatDateTime(notification.createdAt)}
      </p>
    </button>
  );
}

function NotificationList({
  notifications,
  isLoading,
  isError = false,
  errorMessage,
  onOpen,
  onMarkAllRead,
  isMarkingAll,
  showFooterLink = true,
  maxHeightClassName = 'max-h-[min(24rem,60vh)]',
}: {
  notifications: NotificationRow[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onOpen: (notification: NotificationRow) => void;
  onMarkAllRead: () => void;
  isMarkingAll: boolean;
  showFooterLink?: boolean;
  maxHeightClassName?: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (isError && !notifications?.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Chưa tải được thông báo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {errorMessage || 'Vui lòng tải lại trang hoặc thử lại sau.'}
        </p>
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Chưa có thông báo
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Thông báo
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isMarkingAll || !notifications.some((n) => !n.isRead)}
          onClick={onMarkAllRead}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      <div className={cn('overflow-y-auto overscroll-contain', maxHeightClassName)}>
        <div className="space-y-1.5 p-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
      {showFooterLink && (
        <div className="border-t px-3 py-2">
          <Link
            href="/notifications"
            className="inline-flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Xem tất cả thông báo
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifications, isLoading } = useNotifications(15, { enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleOpenNotification(notification: NotificationRow) {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }
    setOpen(false);
    if (notification.href) {
      router.push(notification.href);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="relative size-11 shrink-0 rounded-xl"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onOpen={handleOpenNotification}
            onMarkAllRead={() => markAllRead.mutate()}
            isMarkingAll={markAllRead.isPending}
          />
        </div>
      )}
    </div>
  );
}

export function NotificationsPanel({
  limit = 50,
  initialNotifications,
  initialError,
  showFooterLink = true,
}: {
  limit?: number;
  initialNotifications?: NotificationRow[];
  initialError?: string | null;
  showFooterLink?: boolean;
}) {
  const router = useRouter();
  const {
    data: notifications,
    isLoading,
    isError,
    error,
  } = useNotifications(limit, {
    initialData: initialNotifications,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  async function handleOpenNotification(notification: NotificationRow) {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.href) {
      router.push(notification.href);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Thông báo</h1>
          <p className="text-sm text-muted-foreground">Cập nhật công việc và quy trình nội bộ</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markAllRead.isPending || !notifications?.some((n) => !n.isRead)}
          onClick={() => markAllRead.mutate()}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        isError={Boolean(initialError) || isError}
        errorMessage={initialError || (error instanceof Error ? error.message : undefined)}
        onOpen={handleOpenNotification}
        onMarkAllRead={() => markAllRead.mutate()}
        isMarkingAll={markAllRead.isPending}
        showFooterLink={showFooterLink}
        maxHeightClassName="max-h-[calc(100vh-16rem)]"
      />
    </div>
  );
}
