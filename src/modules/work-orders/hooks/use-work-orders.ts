'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { contractKeys } from '@/modules/contracts/hooks/use-contracts';
import { leadKeys } from '@/modules/crm/hooks/use-leads';
import {
  createWorkOrderFromContractAction,
  completeWorkOrderAction,
  getWorkOrderAction,
  getWorkOrderByContractIdAction,
  getWorkOrdersAction,
  updateWorkOrderInfoAction,
  updateWorkOrderStatusAction,
} from '../actions/work-order.actions';
import type {
  CompleteWorkOrderInput,
  CreateWorkOrderFromContractInput,
  UpdateWorkOrderInfoInput,
  UpdateWorkOrderStatusInput,
  WorkOrderFilters,
} from '../schema/work-order.schema';

export const workOrderKeys = {
  all: ['work-orders'] as const,
  list: (filters?: WorkOrderFilters) => ['work-orders', 'list', filters ?? {}] as const,
  detail: (id: string) => ['work-orders', 'detail', id] as const,
  byContract: (contractId: string) => ['work-orders', 'by-contract', contractId] as const,
};

export function useWorkOrders(filters: WorkOrderFilters = {}) {
  return useQuery({
    queryKey: workOrderKeys.list(filters),
    queryFn: async () => {
      const result = await getWorkOrdersAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: workOrderKeys.detail(id),
    queryFn: async () => {
      const result = await getWorkOrderAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useWorkOrderByContract(contractId: string, enabled = true) {
  return useQuery({
    queryKey: workOrderKeys.byContract(contractId),
    queryFn: async () => {
      const result = await getWorkOrderByContractIdAction(contractId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(contractId) && enabled,
  });
}

export function useCreateWorkOrderFromContract() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateWorkOrderFromContractInput) =>
      createWorkOrderFromContractAction(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        queryClient.invalidateQueries({
          queryKey: workOrderKeys.byContract(variables.contractId),
        });
        queryClient.invalidateQueries({
          queryKey: contractKeys.detail(variables.contractId),
        });
        queryClient.invalidateQueries({ queryKey: contractKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        router.push(`/work-orders/${result.data.id}`);
      }
    },
  });
}

export function useUpdateWorkOrderInfo(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkOrderInfoInput) => updateWorkOrderInfoAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useUpdateWorkOrderStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkOrderStatusInput) =>
      updateWorkOrderStatusAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useCompleteWorkOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteWorkOrderInput) => completeWorkOrderAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}
