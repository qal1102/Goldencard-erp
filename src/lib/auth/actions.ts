'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { loginPerfLog } from '@/lib/server/login-perf-log';

export type LoginFormState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const started = performance.now();
  loginPerfLog('loginAction:start', 0);

  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
    loginPerfLog('loginAction:end', performance.now() - started, { ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      loginPerfLog('loginAction:end', performance.now() - started, {
        ok: false,
        type: error.type,
      });
      if (error.type === 'CredentialsSignin') {
        return { error: 'Email hoặc mật khẩu không đúng.' };
      }
      return { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' };
    }
    loginPerfLog('loginAction:end', performance.now() - started, { ok: true, redirect: true });
    // signIn throws a NEXT_REDIRECT on success — must re-throw
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
  redirect('/login');
}
