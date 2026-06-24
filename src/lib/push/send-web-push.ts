import 'server-only';

import { and, eq } from 'drizzle-orm';
import webPush from 'web-push';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';

type PushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
  tag?: string | null;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@goldencard.cloud';

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return false;

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configureWebPush()) return;

  try {
    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, userId),
      columns: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (subscriptions.length === 0) return;

    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url ?? '/notifications',
              tag: payload.tag ?? 'goldencard-erp',
            }),
          );

          await db
            .update(pushSubscriptions)
            .set({
              lastUsedAt: new Date(),
              lastError: null,
              updatedAt: new Date(),
            })
            .where(eq(pushSubscriptions.id, subscription.id));
        } catch (error) {
          const statusCode =
            typeof error === 'object' && error && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : null;

          if (statusCode === 404 || statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, subscription.id));
            return;
          }

          await db
            .update(pushSubscriptions)
            .set({
              lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown push error',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(pushSubscriptions.id, subscription.id),
                eq(pushSubscriptions.userId, userId),
              ),
            );
        }
      }),
    );
  } catch (error) {
    console.error('[web-push]', error);
  }
}
