'use client';

import { BellRingIcon, BellOffIcon } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

type PushStatus = 'checking' | 'not_configured' | 'blocked' | 'off' | 'on';

export function PushNotificationToggle() {
  const [status, setStatus] = useState<PushStatus>('checking');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPushSupported()) return;

    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch('/api/push/subscription', { cache: 'no-store' });
        if (!response.ok) throw new Error('Không tải được trạng thái thông báo');
        const data = (await response.json()) as {
          enabled?: boolean;
          vapidPublicKey?: string | null;
        };

        if (cancelled) return;
        setVapidPublicKey(data.vapidPublicKey ?? null);
        if (!data.vapidPublicKey) {
          setStatus('not_configured');
          return;
        }
        if (Notification.permission === 'denied') {
          setStatus('blocked');
          return;
        }
        setStatus(data.enabled ? 'on' : 'off');
      } catch {
        if (!cancelled) setStatus('off');
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enablePush() {
    if (!vapidPublicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'blocked' : 'off');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const response = await fetch('/api/push/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!response.ok) throw new Error('Không lưu được đăng ký thông báo');

    setStatus('on');
  }

  async function disablePush() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    setStatus('off');
  }

  if (status === 'checking') return null;

  if (status === 'not_configured') {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <BellOffIcon className="size-4" />
        Chưa cấu hình push
      </Button>
    );
  }

  if (status === 'blocked') {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <BellOffIcon className="size-4" />
        iPhone đang chặn
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={status === 'on' ? 'secondary' : 'outline'}
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            if (status === 'on') {
              await disablePush();
            } else {
              await enablePush();
            }
          } catch (error) {
            console.error('[push-toggle]', error);
          }
        })
      }
    >
      {status === 'on' ? <BellRingIcon className="size-4" /> : <BellOffIcon className="size-4" />}
      {status === 'on' ? 'Đã bật thông báo' : 'Bật thông báo'}
    </Button>
  );
}
