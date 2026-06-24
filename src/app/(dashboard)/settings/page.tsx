import Link from 'next/link';
import { KeyRoundIcon } from 'lucide-react';
import { ProfileForm } from '@/components/auth/profile-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifySession } from '@/lib/auth/dal';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function SettingsPage() {
  const session = await verifySession();

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Cập nhật thông tin cá nhân, avatar và bảo mật đăng nhập của bạn.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ cá nhân</CardTitle>
          <CardDescription>
            Các thay đổi hồ sơ được lưu vào nhật ký hoạt động để Super Admin truy vết.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảo mật</CardTitle>
          <CardDescription>
            Đổi mật khẩu đăng nhập định kỳ hoặc khi nghi ngờ mật khẩu bị lộ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/settings/security" />}>
            <KeyRoundIcon className="size-4" />
            Đổi mật khẩu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
