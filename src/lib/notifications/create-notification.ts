import 'server-only';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { dedupeRecipients } from './dedupe-recipients';
import type { CreateNotificationInput, CreateNotificationsOptions } from './types';

export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const [row] = await db
    .insert(notifications)
    .values({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      href: input.href ?? null,
    })
    .returning({ id: notifications.id });

  if (!row) throw new Error('Không thể tạo thông báo');
  return row.id;
}

export async function createNotificationsForUsers(
  recipientUserIds: string[],
  payload: Omit<CreateNotificationInput, 'recipientUserId'>,
  options?: CreateNotificationsOptions,
): Promise<void> {
  const uniqueRecipients = dedupeRecipients(
    recipientUserIds,
    options?.actorUserId ?? payload.actorUserId,
    { includeActor: options?.includeActor },
  );

  if (uniqueRecipients.length === 0) return;

  await db.insert(notifications).values(
    uniqueRecipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: payload.actorUserId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      module: payload.module,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      href: payload.href ?? null,
    })),
  );
}

/** Notification failures must never break the main workflow. */
export async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error('[notification]', error);
  }
}
