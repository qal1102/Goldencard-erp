import { NotificationsPanel } from '@/components/notifications/notification-bell';
import { getMyNotificationsAction } from '@/lib/notifications/actions';
import type { NotificationRow } from '@/lib/notifications/types';

function serializeNotification(notification: NotificationRow): NotificationRow {
  return {
    ...notification,
    createdAt:
      notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
    readAt:
      notification.readAt instanceof Date
        ? notification.readAt.toISOString()
        : notification.readAt,
  };
}

export default async function NotificationsPage() {
  const result = await getMyNotificationsAction(200);
  const initialNotifications = result.success
    ? result.data.map(serializeNotification)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tất cả thông báo</h1>
        <p className="text-sm text-muted-foreground">
          Hiển thị tối đa 200 thông báo gần nhất của tài khoản hiện tại.
        </p>
      </div>
      <NotificationsPanel
        limit={200}
        initialNotifications={initialNotifications}
        initialError={result.success ? null : result.error}
        showFooterLink={false}
      />
    </div>
  );
}
