'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';

export type LoginFormState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return { error: 'Email hoặc mật khẩu không đúng.' };
      }
      return { error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' };
    }
    // signIn throws a NEXT_REDIRECT on success — must re-throw
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
  redirect('/login');
}
