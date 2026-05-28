import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: string[];
    } & DefaultSession['user'];
  }

  interface User {
    roles?: string[];
  }
}
