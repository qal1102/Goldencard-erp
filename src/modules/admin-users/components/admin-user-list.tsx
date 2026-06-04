'use client';

import Link from 'next/link';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TappableListCard } from '@/components/ui/tappable-list-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleLabel } from '../lib/role-labels';
import { useAdminRoles, useAdminUsers } from '../hooks/use-admin-users';
import { AdminUserStatusBadge } from './admin-user-status-badge';

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminUserList() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const filters = useMemo(
    () => ({
      q: debouncedQ || undefined,
      roleId: roleFilter || undefined,
    }),
    [debouncedQ, roleFilter],
  );

  const { data: users, isLoading } = useAdminUsers(filters);
  const { data: roles } = useAdminRoles();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDebouncedQ(search.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Tìm
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? '')}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Tất cả vai trò">
              {(value) => {
                if (!value) return 'Tất cả vai trò';
                const role = roles?.find((r) => r.id === value);
                return role ? getRoleLabel(role.name) : 'Tất cả vai trò';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả vai trò</SelectItem>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {getRoleLabel(role.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="ml-auto w-full sm:w-auto"
          nativeButton={false}
          render={<Link href="/admin/users/new" />}
        >
          <PlusIcon className="size-4" />
          Tạo tài khoản
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && users?.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Không có tài khoản phù hợp.
        </p>
      )}

      {!isLoading && users && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <TappableListCard
              key={user.id}
              href={`/admin/users/${user.id}`}
              ariaLabel={`Xem tài khoản ${user.name}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminUserStatusBadge isActive={user.isActive} />
                    {user.isSuperAdmin && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                        Super Admin
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.roles.map((r) => getRoleLabel(r.name)).join(' · ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tạo ngày {formatDate(user.createdAt)}
                  {user.lastLoginAt
                    ? ` · Đăng nhập gần nhất ${formatDateTime(user.lastLoginAt)}`
                    : ''}
                </p>
              </div>
            </TappableListCard>
          ))}
        </div>
      )}
    </div>
  );
}
