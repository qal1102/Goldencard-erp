import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema/users';

/** Cached session for the current request (layout + pages). */
export const getAuthSession = cache(async () => auth());

export const verifySession = cache(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect('/login');

  if (session.user.isActive === false) {
    await signOut({ redirect: false });
    redirect('/login');
  }

  return session;
});

export const getCurrentUser = cache(async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
      isSuperAdmin: true,
    },
  });
  return user ?? null;
});
