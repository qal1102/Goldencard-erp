const SW_VERSION = 'goldencard-erp-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'GoldenCard ERP', body: event.data.text() };
  }

  const title = payload.title || 'GoldenCard ERP';
  const options = {
    body: payload.body || 'Có cập nhật mới trong hệ thống.',
    icon: '/goldencard-app-icon-192.png',
    badge: '/goldencard-app-icon-192.png',
    data: {
      url: payload.url || '/notifications',
    },
    tag: payload.tag || SW_VERSION,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/notifications', self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && new URL(client.url).origin === targetUrl.origin) {
          client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
