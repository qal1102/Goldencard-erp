import { verifySession } from '@/lib/auth/dal';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsSecurityPage() {
  await verifySession();

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Bảo mật tài khoản</h1>
        <p className="text-xs text-muted-foreground">
          Đổi mật khẩu đăng nhập của bạn. Sau khi đổi, bạn sẽ cần đăng nhập lại.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
          <CardDescription>
            Dùng mật khẩu mạnh, khác mật khẩu tạm thời hoặc mật khẩu cũ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
