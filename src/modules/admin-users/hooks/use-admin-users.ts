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
import type {
  AdminUserFilters,
  CreateAdminUserInput,
  ResetAdminUserPasswordInput,
  SetAdminUserActiveInput,
  UpdateAdminUserInput,
} from '../schema/admin-user.schema';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (filters?: AdminUserFilters) => ['admin-users', 'list', filters ?? {}] as const,
  detail: (id: string) => ['admin-users', 'detail', id] as const,
  roles: () => ['admin-users', 'roles'] as const,
};

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: async () => {
      const result = await getAdminUsersAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
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

export function useAdminRoles() {
  return useQuery({
    queryKey: adminUserKeys.roles(),
    queryFn: async () => {
      const result = await getRolesAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
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
