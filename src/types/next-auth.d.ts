import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: string[];
      isSuperAdmin: boolean;
      isActive: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    roles?: string[];
    isSuperAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roles?: string[];
    isSuperAdmin?: boolean;
    isActive?: boolean;
    userStatusCheckedAt?: number;
  }
}
