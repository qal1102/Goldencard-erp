import { count, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { getAuthSession } from '@/lib/auth/dal';
import { pushSubscriptionSchema } from '@/lib/push/push-subscription.schema';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.isActive === false) {
      return NextResponse.json({ enabled: false }, { status: 401 });
    }

    const [row] = await db
      .select({ value: count() })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id));

    return NextResponse.json({
      enabled: Number(row?.value ?? 0) > 0,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
    });
  } catch {
    return NextResponse.json({
      enabled: false,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
      unavailable: true,
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.isActive === false) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = pushSubscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Subscription không hợp lệ' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent');
    const now = new Date();

    await db
      .insert(pushSubscriptions)
      .values({
        userId: session.user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        updatedAt: now,
        lastError: null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: session.user.id,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          userAgent,
          updatedAt: now,
          lastError: null,
        },
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa thể bật thông báo push' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.isActive === false) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint không hợp lệ' }, { status: 400 });
    }

    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa thể tắt thông báo push' }, { status: 503 });
  }
}
