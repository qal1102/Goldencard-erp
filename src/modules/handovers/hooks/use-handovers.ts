'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { leadKeys } from '@/modules/crm/hooks/use-leads';
import { workOrderKeys } from '@/modules/work-orders/hooks/use-work-orders';
import {
  createHandoverFromWorkOrderAction,
  getHandoverAction,
  getHandoverByWorkOrderIdAction,
  getHandoversAction,
  updateHandoverInfoAction,
  updateHandoverStatusAction,
} from '../actions/handover.actions';
import type {
  CreateHandoverFromWorkOrderInput,
  HandoverFilters,
  UpdateHandoverInfoInput,
  UpdateHandoverStatusInput,
} from '../schema/handover.schema';

export const handoverKeys = {
  all: ['handovers'] as const,
  list: (filters?: HandoverFilters) => ['handovers', 'list', filters ?? {}] as const,
  detail: (id: string) => ['handovers', 'detail', id] as const,
  byWorkOrder: (workOrderId: string) => ['handovers', 'by-work-order', workOrderId] as const,
};

export function useHandovers(filters: HandoverFilters = {}) {
  return useQuery({
    queryKey: handoverKeys.list(filters),
    queryFn: async () => {
      const result = await getHandoversAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useHandover(id: string) {
  return useQuery({
    queryKey: handoverKeys.detail(id),
    queryFn: async () => {
      const result = await getHandoverAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useHandoverByWorkOrder(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: handoverKeys.byWorkOrder(workOrderId),
    queryFn: async () => {
      const result = await getHandoverByWorkOrderIdAction(workOrderId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(workOrderId) && enabled,
  });
}

export function useCreateHandoverFromWorkOrder() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateHandoverFromWorkOrderInput) =>
      createHandoverFromWorkOrderAction(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: handoverKeys.all });
        queryClient.invalidateQueries({
          queryKey: handoverKeys.byWorkOrder(variables.workOrderId),
        });
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        queryClient.invalidateQueries({
          queryKey: workOrderKeys.detail(variables.workOrderId),
        });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        router.replace(`/handovers/${result.data.id}`);
      }
    },
  });
}

export function useUpdateHandoverInfo(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateHandoverInfoInput) => updateHandoverInfoAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: handoverKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: handoverKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useUpdateHandoverStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateHandoverStatusInput) => updateHandoverStatusAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: handoverKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: handoverKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      }
    },
  });
}
