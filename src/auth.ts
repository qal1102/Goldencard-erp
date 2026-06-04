import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/db';
import { roles } from '@/db/schema/roles';
import { userRoles } from '@/db/schema/user-roles';
import { users } from '@/db/schema/users';
import { USER_STATUS_REFRESH_MS } from '@/lib/auth/session-refresh';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();

        const user = await db.query.users.findFirst({
          where: eq(users.email, normalizedEmail),
        });

        if (!user || !user.isActive || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        const roleRows = await db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        await db
          .update(users)
          .set({ lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? null,
          roles: roleRows.map((r) => r.name),
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token['id'] = user.id;
        token['roles'] = user.roles ?? [];
        token['isSuperAdmin'] = user.isSuperAdmin ?? false;
        token['isActive'] = true;
        token['userStatusCheckedAt'] = Date.now();
      }

      const userId = token['id'] as string | undefined;
      if (!userId) return token;

      const checkedAt = (token['userStatusCheckedAt'] as number | undefined) ?? 0;
      const shouldRefresh = Date.now() - checkedAt > USER_STATUS_REFRESH_MS;

      if (shouldRefresh) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            isActive: true,
            isSuperAdmin: true,
          },
        });

        token['userStatusCheckedAt'] = Date.now();

        if (!dbUser?.isActive) {
          token['isActive'] = false;
        } else {
          token['isActive'] = true;
          token['isSuperAdmin'] = dbUser.isSuperAdmin;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = (token['id'] as string | undefined) ?? '';
      session.user.roles = (token['roles'] as string[] | undefined) ?? [];
      session.user.isSuperAdmin = (token['isSuperAdmin'] as boolean | undefined) ?? false;
      session.user.isActive = (token['isActive'] as boolean | undefined) ?? true;
      return session;
    },
  },
});
