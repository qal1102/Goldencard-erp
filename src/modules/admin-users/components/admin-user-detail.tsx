'use client';

import { useState } from 'react';
import { BackButton } from '@/components/navigation/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role } from '@/db/schema/roles';
import type { AdminUserDetail as AdminUserDetailType } from '../lib/admin-user.queries';
import {
  useAdminRoles,
  useAdminUser,
  useResetAdminUserPassword,
  useSetAdminUserActive,
  useUpdateAdminUser,
} from '../hooks/use-admin-users';
import { AdminUserStatusBadge } from './admin-user-status-badge';
import { RoleCheckboxGroup } from './role-checkbox-group';

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ManageFormProps = {
  user: AdminUserDetailType;
  allRoles: Role[];
};

function AdminUserManageForm({ user, allRoles }: ManageFormProps) {
  const updateUser = useUpdateAdminUser(user.id);
  const resetPassword = useResetAdminUserPassword(user.id);
  const setActive = useSetAdminUserActive(user.id);
  const isTargetSuperAdmin = user.isSuperAdmin;

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? '');
  const [roleIds, setRoleIds] = useState(user.roles.map((r) => r.id));
  const [isActive, setIsActive] = useState(user.isActive);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = await updateUser.mutateAsync({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      jobTitle: jobTitle.trim() || null,
      roleIds,
      isActive,
    });

    if (!result.success) setError(result.error);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    const result = await resetPassword.mutateAsync({ password: newPassword });
    if (!result.success) {
      setPasswordError(result.error);
      return;
    }
    setNewPassword('');
  }

  async function handleToggleActive() {
    setToggleError(null);
    const next = !isActive;
    const result = await setActive.mutateAsync({ isActive: next });
    if (!result.success) {
      setToggleError(result.error);
      return;
    }
    setIsActive(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <AdminUserStatusBadge isActive={isActive} />
              {isTargetSuperAdmin && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  Super Admin
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Họ tên *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-job-title">Chức danh hiển thị</Label>
              <Input
                id="edit-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VD: Quản lý dự án, Kỹ sư trưởng, Sales..."
                autoComplete="organization-title"
              />
            </div>

            <RoleCheckboxGroup
              roles={allRoles}
              selectedIds={roleIds}
              onChange={setRoleIds}
            />

            <label
              className={`flex min-h-11 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                isTargetSuperAdmin ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={isActive}
                disabled={isTargetSuperAdmin}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Tài khoản đang hoạt động</span>
            </label>
            {isTargetSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                Không thể khóa tài khoản Super Admin.
              </p>
            )}

            <Button type="submit" className="min-h-11" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Đặt lại mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            {passwordError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Mật khẩu mới *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="min-h-11"
              disabled={resetPassword.isPending || !newPassword}
            >
              {resetPassword.isPending ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trạng thái đăng nhập</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {toggleError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {toggleError}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Tài khoản bị khóa sẽ không đăng nhập được.
          </p>
          <Button
            type="button"
            variant={isActive ? 'destructive' : 'default'}
            className="min-h-11"
            disabled={setActive.isPending || isTargetSuperAdmin}
            onClick={handleToggleActive}
          >
            {setActive.isPending
              ? 'Đang xử lý...'
              : isActive
                ? 'Khóa tài khoản'
                : 'Mở khóa tài khoản'}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tạo lúc {formatDateTime(user.createdAt)}
        {user.updatedAt ? ` · Cập nhật ${formatDateTime(user.updatedAt)}` : ''}
        {user.lastLoginAt ? ` · Đăng nhập gần nhất ${formatDateTime(user.lastLoginAt)}` : ''}
      </p>
    </div>
  );
}

type Props = {
  userId: string;
};

export function AdminUserDetail({ userId }: Props) {
  const { data: user, isLoading } = useAdminUser(userId);
  const { data: roles } = useAdminRoles();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">Không tìm thấy tài khoản.</p>
    );
  }

  if (!roles) {
    return <Skeleton className="h-48 w-full" />;
  }

  const remountKey = `${user.id}-${user.updatedAt?.toString() ?? ''}-${user.isActive}`;

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallbackHref="/admin/users" />
      <AdminUserManageForm key={remountKey} user={user} allRoles={roles} />
    </div>
  );
}
