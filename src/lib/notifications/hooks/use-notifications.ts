'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotificationsAction,
  getUnreadNotificationCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '../actions';
import type { NotificationRow } from '../types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit?: number) => ['notifications', 'list', limit ?? 20] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export function useNotifications(
  limit = 20,
  options?: { enabled?: boolean; initialData?: NotificationRow[] },
) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: async () => {
      const result = await getMyNotificationsAction(limit);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: options?.initialData,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnMount: options?.initialData ? false : true,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getUnreadNotificationCountAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markNotificationReadAction(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
