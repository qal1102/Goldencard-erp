import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { perfTimed } from '@/lib/server/perf-log';
import { getRequestPerfRoute, recordRequestSpan } from '@/lib/server/request-perf';

/** Cached session for the current request (layout + pages). */
export const getAuthSession = cache(async () => {
  const route = getRequestPerfRoute();
  return perfTimed('auth:getAuthSession', () => auth(), { route });
});

export const verifySession = cache(async () => {
  const route = getRequestPerfRoute();
  const started = performance.now();
  const session = await getAuthSession();
  if (!session?.user?.id) redirect('/login');

  if (session.user.isActive === false) {
    await signOut({ redirect: false });
    redirect('/login');
  }

  recordRequestSpan('auth:verifySession', performance.now() - started, true);
  return session;
});

export const getCurrentUser = cache(async (userId: string) => {
  const route = getRequestPerfRoute();
  const user = await perfTimed(
    'auth:getCurrentUser',
    () =>
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isActive: true,
          isSuperAdmin: true,
        },
      }),
    { route },
  );
  return user ?? null;
});
