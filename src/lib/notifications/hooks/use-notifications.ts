'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotificationsAction,
  getUnreadNotificationCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '../actions';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit?: number) => ['notifications', 'list', limit ?? 20] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export function useNotifications(limit = 20, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: async () => {
      const result = await getMyNotificationsAction(limit);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}

const UNREAD_COUNT_DEFER_MS = 400;

function useDeferredQueryEnabled(eager = false) {
  const [deferredReady, setDeferredReady] = useState(eager);

  useEffect(() => {
    if (eager) {
      setDeferredReady(true);
      return;
    }

    const enable = () => setDeferredReady(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(enable, { timeout: UNREAD_COUNT_DEFER_MS + 100 });
      return () => cancelIdleCallback(id);
    }

    const timeoutId = window.setTimeout(enable, UNREAD_COUNT_DEFER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [eager]);

  return deferredReady || eager;
}

export function useUnreadNotificationCount(options?: { eager?: boolean }) {
  const enabled = useDeferredQueryEnabled(options?.eager ?? false);

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getUnreadNotificationCountAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled,
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
