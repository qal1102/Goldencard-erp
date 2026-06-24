# iPhone Home Screen setup

Last updated: 2026-06-24.

## What is already configured

GoldenCard ERP now includes the baseline files needed for Home Screen web-app behavior:

- Web app manifest at `/manifest.webmanifest`
- App icons in `public/goldencard-icon.svg` and `public/goldencard-maskable-icon.svg`
- Apple web app metadata in `src/app/layout.tsx`
- Lightweight service worker at `/sw.js`

The service worker does not cache ERP data. This avoids showing stale CRM, inventory, quotation, or warranty data.

## User setup on iPhone

1. Open Safari on iPhone.
2. Go to `https://goldencard.cloud`.
3. Log in once.
4. Tap the Share button.
5. Tap `Add to Home Screen`.
6. Keep the name `GoldenCard ERP` or shorten it to `GoldenCard`.
7. Open GoldenCard from the new Home Screen icon.

After this, the site opens like a standalone app instead of a normal Safari tab.

## Notification setup

iOS supports Web Push for web apps added to the Home Screen on iOS/iPadOS 16.4+.

The user must open the Home Screen web app and tap a real in-app action such as `Bật thông báo` before iOS will show the permission prompt.

## Remaining work for real push notifications

The app now includes the application code for background Web Push notifications.

Before enabling it in production, finish these production setup steps:

- Inspect and apply migration `0034_push_subscriptions.sql`.
- Generate VAPID keys:
  `npx web-push generate-vapid-keys`
- Set Vercel production env vars:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
- Redeploy production after the env vars are set.

Until the migration and env vars are present, the push toggle will not send background notifications. Internal in-app notifications still work.
