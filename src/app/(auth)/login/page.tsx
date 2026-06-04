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

type Props = {
  searchParams: Promise<{ passwordChanged?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');

  const params = await searchParams;
  const passwordChanged = params.passwordChanged === '1';

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppBrand className="mb-1" showTagline />
        <CardTitle className="mt-3 text-lg">Đăng nhập</CardTitle>
        <CardDescription>Nhập email và mật khẩu để tiếp tục</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {passwordChanged && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground">
            Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
          </div>
        )}
        <LoginForm />
      </CardContent>
    </Card>
  );
}
