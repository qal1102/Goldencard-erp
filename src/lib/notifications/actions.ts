'use server';

import { and, desc, eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import type { NotificationRow } from './types';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function mapNotification(row: typeof notifications.$inferSelect): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    module: row.module,
    entityType: row.entityType,
    entityId: row.entityId,
    href: row.href,
    isRead: row.isRead,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function getMyNotificationsAction(
  limit = 20,
): Promise<ActionResult<NotificationRow[]>> {
  try {
    const session = await getSessionOrThrow();
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const rows = await db.query.notifications.findMany({
      where: eq(notifications.recipientUserId, session.user.id),
      orderBy: [desc(notifications.createdAt)],
      limit: safeLimit,
    });

    return { success: true, data: rows.map(mapNotification) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getUnreadNotificationCountAction(): Promise<ActionResult<number>> {
  try {
    const session = await getSessionOrThrow();

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, session.user.id),
          eq(notifications.isRead, false),
        ),
      );

    return { success: true, data: row?.count ?? 0 };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const now = new Date();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, session.user.id),
        ),
      );

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const now = new Date();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.recipientUserId, session.user.id),
          eq(notifications.isRead, false),
        ),
      );

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
