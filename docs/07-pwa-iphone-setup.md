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

The current app has internal notifications in the database and UI. It does not yet send background Web Push notifications to iPhone.

To enable true push notifications later, add a separate backend feature:

- Generate VAPID keys and set them as production env vars.
- Add a `push_subscriptions` table.
- Add an API route to save/remove subscriptions per logged-in user.
- Add a client button `Bật thông báo` that calls `Notification.requestPermission()` and `PushManager.subscribe()`.
- Send Web Push from existing notification events.

This should be built as a separate task because it needs a safe DB migration and production env setup.
