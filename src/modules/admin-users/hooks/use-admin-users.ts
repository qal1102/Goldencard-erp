'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createAdminUserAction,
  getAdminUserAction,
  getAdminUsersAction,
  getRolesAction,
  resetAdminUserPasswordAction,
  setAdminUserActiveAction,
  updateAdminUserAction,
} from '../actions/admin-user.actions';
import type { SerializedAdminUserListRow } from '../lib/admin-user-serialize';
import type { Role } from '@/db/schema/roles';
import type {
  AdminUserFilters,
  CreateAdminUserInput,
  ResetAdminUserPasswordInput,
  SetAdminUserActiveInput,
  UpdateAdminUserInput,
} from '../schema/admin-user.schema';

const ALL_ROLES_FILTER = '__all__';

export function normalizeAdminUserFilters(filters: AdminUserFilters = {}): AdminUserFilters {
  return {
    q: filters.q?.trim() || undefined,
    roleId: filters.roleId || undefined,
  };
}

export function adminUserListQueryKey(filters: AdminUserFilters = {}) {
  const normalized = normalizeAdminUserFilters(filters);
  return ['admin-users', 'list', normalized.q ?? '', normalized.roleId ?? ''] as const;
}

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: adminUserListQueryKey,
  detail: (id: string) => ['admin-users', 'detail', id] as const,
  roles: () => ['admin-users', 'roles'] as const,
};

export { ALL_ROLES_FILTER };

type UseAdminUsersOptions = {
  initialData?: SerializedAdminUserListRow[];
  enabled?: boolean;
};

export function useAdminUsers(
  filters: AdminUserFilters = {},
  options?: UseAdminUsersOptions,
) {
  const normalized = normalizeAdminUserFilters(filters);

  return useQuery({
    queryKey: adminUserKeys.list(normalized),
    queryFn: async () => {
      const result = await getAdminUsersAction(normalized);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: options?.initialData,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminUserKeys.detail(id),
    queryFn: async () => {
      const result = await getAdminUserAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

type UseAdminRolesOptions = {
  initialData?: Role[];
  enabled?: boolean;
};

export function useAdminRoles(options?: UseAdminRolesOptions) {
  return useQuery({
    queryKey: adminUserKeys.roles(),
    queryFn: async () => {
      const result = await getRolesAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: options?.initialData,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateAdminUserInput) => createAdminUserAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
        router.replace(`/admin/users/${result.data.id}`);
      }
    },
  });
}

export function useUpdateAdminUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminUserInput) => updateAdminUserAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      }
    },
  });
}

export function useResetAdminUserPassword(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResetAdminUserPasswordInput) =>
      resetAdminUserPasswordAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      }
    },
  });
}

export function useSetAdminUserActive(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetAdminUserActiveInput) => setAdminUserActiveAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
      }
    },
  });
}
