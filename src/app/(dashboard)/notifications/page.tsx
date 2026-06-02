import { NotificationsPanel } from '@/components/notifications/notification-bell';

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <NotificationsPanel limit={50} />
    </div>
  );
}
