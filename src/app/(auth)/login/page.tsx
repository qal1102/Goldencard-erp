import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppBrand } from '@/components/layout/app-brand';
import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppBrand className="mb-1" showTagline />
        <CardTitle className="mt-3 text-lg">Đăng nhập</CardTitle>
        <CardDescription>Nhập email và mật khẩu để tiếp tục</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
