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
import { loginPerfLog, loginPerfLogError, loginPerfTimed } from '@/lib/server/login-perf-log';

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
        const authorizeStarted = performance.now();
        loginPerfLog('authorize:start');

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();

        const user = await loginPerfTimed('authorize:userQuery', () =>
          db.query.users.findFirst({
            where: eq(users.email, normalizedEmail),
          }),
        );

        if (!user || !user.isActive || !user.passwordHash) {
          loginPerfLog('authorize:end', performance.now() - authorizeStarted, { ok: false });
          return null;
        }

        const isValid = await loginPerfTimed('authorize:bcryptCompare', () =>
          bcrypt.compare(password, user.passwordHash!),
        );
        if (!isValid) {
          loginPerfLog('authorize:end', performance.now() - authorizeStarted, { ok: false });
          return null;
        }

        const roleRows = await loginPerfTimed('authorize:rolesQuery', () =>
          db
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, user.id)),
        );

        const lastLoginStarted = performance.now();
        void db
          .update(users)
          .set({ lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .then(() =>
            loginPerfLog(
              'authorize:lastLoginUpdate',
              performance.now() - lastLoginStarted,
              { async: true },
            ),
          )
          .catch((error) => loginPerfLogError('authorize:lastLoginUpdate', error));

        loginPerfLog('authorize:end', performance.now() - authorizeStarted, { ok: true });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: null,
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
      const jwtStarted = performance.now();

      if (user) {
        token['id'] = user.id;
        token['roles'] = user.roles ?? [];
        token['isSuperAdmin'] = user.isSuperAdmin ?? false;
        token['isActive'] = true;
        token['userStatusCheckedAt'] = Date.now();
        loginPerfLog('jwt:initialSignIn', performance.now() - jwtStarted);
        return token;
      }

      const userId = token['id'] as string | undefined;
      if (!userId) return token;

      const checkedAt = (token['userStatusCheckedAt'] as number | undefined) ?? 0;
      const shouldRefresh = Date.now() - checkedAt > USER_STATUS_REFRESH_MS;

      if (shouldRefresh) {
        const dbUser = await loginPerfTimed('jwt:statusRefreshQuery', () =>
          db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
              isActive: true,
              isSuperAdmin: true,
            },
          }),
        );

        token['userStatusCheckedAt'] = Date.now();

        if (!dbUser?.isActive) {
          token['isActive'] = false;
        } else {
          token['isActive'] = true;
          token['isSuperAdmin'] = dbUser.isSuperAdmin;
        }

        loginPerfLog('jwt:statusRefresh', performance.now() - jwtStarted);
        return token;
      }

      loginPerfLog('jwt:cached', performance.now() - jwtStarted);
      return token;
    },
    async session({ session, token }) {
      const sessionStarted = performance.now();
      session.user.id = (token['id'] as string | undefined) ?? '';
      session.user.roles = (token['roles'] as string[] | undefined) ?? [];
      session.user.isSuperAdmin = (token['isSuperAdmin'] as boolean | undefined) ?? false;
      session.user.isActive = (token['isActive'] as boolean | undefined) ?? true;
      loginPerfLog('session:callback', performance.now() - sessionStarted);
      return session;
    },
  },
});
