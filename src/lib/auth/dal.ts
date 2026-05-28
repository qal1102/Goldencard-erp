import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema/users';

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
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
    },
  });
  return user ?? null;
});
