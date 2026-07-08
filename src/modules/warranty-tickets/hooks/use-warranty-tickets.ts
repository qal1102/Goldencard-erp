'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { readLocalQueryCache, writeLocalQueryCache } from '@/lib/query/local-storage-cache';
import { leadKeys } from '@/modules/crm/hooks/use-leads';
import { handoverKeys } from '@/modules/handovers/hooks/use-handovers';
import {
  createWarrantyTicketAction,
  createWarrantyTicketFromHandoverAction,
  getWarrantyAssignableUsersAction,
  getWarrantyTicketAction,
  getWarrantyTicketsAction,
  getWarrantyTicketsByCustomerAction,
  getWarrantyTicketsByHandoverAction,
  resolveWarrantyTicketAction,
  updateWarrantyTicketAssignmentAction,
  updateWarrantyTicketStatusAction,
} from '../actions/warranty-ticket.actions';
import type { WarrantyTicketRow } from '../lib/warranty-ticket.queries';
import type {
  CreateWarrantyTicketInput,
  ResolveWarrantyTicketInput,
  UpdateWarrantyTicketAssignmentInput,
  UpdateWarrantyTicketStatusInput,
  WarrantyTicketFilters,
} from '../schema/warranty-ticket.schema';

export function normalizeWarrantyTicketFilters(
  filters: WarrantyTicketFilters = {},
): WarrantyTicketFilters {
  return {
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    customerId: filters.customerId || undefined,
    handoverId: filters.handoverId || undefined,
    leadId: filters.leadId || undefined,
  };
}

export function warrantyTicketListQueryKey(filters: WarrantyTicketFilters = {}) {
  const n = normalizeWarrantyTicketFilters(filters);
  return [
    'warranty-tickets',
    'list',
    n.status ?? '',
    n.priority ?? '',
    n.customerId ?? '',
    n.handoverId ?? '',
    n.leadId ?? '',
  ] as const;
}

export const warrantyTicketKeys = {
  all: ['warranty-tickets'] as const,
  list: warrantyTicketListQueryKey,
  detail: (id: string) => ['warranty-tickets', 'detail', id] as const,
  byHandover: (handoverId: string) => ['warranty-tickets', 'by-handover', handoverId] as const,
  byCustomer: (customerId: string) => ['warranty-tickets', 'by-customer', customerId] as const,
  assignableUsers: () => ['warranty-tickets', 'assignable-users'] as const,
};

type UseWarrantyTicketsOptions = {
  initialData?: WarrantyTicketRow[];
  enabled?: boolean;
  cacheScope?: string;
};

function warrantyTicketLocalCacheKey(filters: WarrantyTicketFilters = {}, scope = 'default') {
  const normalized = normalizeWarrantyTicketFilters(filters);
  return [
    'warranty-tickets.list',
    scope,
    normalized.status ?? 'all',
    normalized.priority ?? 'all',
    normalized.customerId ?? 'all',
    normalized.handoverId ?? 'all',
    normalized.leadId ?? 'all',
  ].join('.');
}

export function useWarrantyTickets(
  filters: WarrantyTicketFilters = {},
  options?: UseWarrantyTicketsOptions,
) {
  const normalized = normalizeWarrantyTicketFilters(filters);
  const cacheKey = warrantyTicketLocalCacheKey(normalized, options?.cacheScope);
  const cachedInitialData = options?.initialData ?? readLocalQueryCache<WarrantyTicketRow[]>(cacheKey);

  return useQuery({
    queryKey: warrantyTicketKeys.list(normalized),
    queryFn: async () => {
      const result = await getWarrantyTicketsAction(normalized);
      if (!result.success) throw new Error(result.error);
      writeLocalQueryCache(cacheKey, result.data);
      return result.data;
    },
    initialData: cachedInitialData,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: options?.initialData === undefined,
    refetchOnWindowFocus: false,
  });
}

export function useWarrantyTicket(id: string) {
  return useQuery({
    queryKey: warrantyTicketKeys.detail(id),
    queryFn: async () => {
      const result = await getWarrantyTicketAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useWarrantyTicketsByHandover(handoverId: string, enabled = true) {
  return useQuery({
    queryKey: warrantyTicketKeys.byHandover(handoverId),
    queryFn: async () => {
      const result = await getWarrantyTicketsByHandoverAction(handoverId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(handoverId) && enabled,
  });
}

export function useWarrantyTicketsByCustomer(customerId: string, enabled = true) {
  return useQuery({
    queryKey: warrantyTicketKeys.byCustomer(customerId),
    queryFn: async () => {
      const result = await getWarrantyTicketsByCustomerAction(customerId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(customerId) && enabled,
  });
}

export function useWarrantyAssignableUsers() {
  return useQuery({
    queryKey: warrantyTicketKeys.assignableUsers(),
    queryFn: async () => {
      const result = await getWarrantyAssignableUsersAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWarrantyTicket() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateWarrantyTicketInput) => createWarrantyTicketAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        queryClient.invalidateQueries({ queryKey: handoverKeys.all });
        router.replace(`/warranty/${result.data.id}`);
      }
    },
  });
}

export function useCreateWarrantyTicketFromHandover(handoverId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (
      input: Omit<
        CreateWarrantyTicketInput,
        | 'customerId'
        | 'leadId'
        | 'surveyId'
        | 'quotationId'
        | 'contractId'
        | 'workOrderId'
        | 'handoverId'
      >,
    ) => createWarrantyTicketFromHandoverAction(handoverId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.all });
        queryClient.invalidateQueries({
          queryKey: warrantyTicketKeys.byHandover(handoverId),
        });
        queryClient.invalidateQueries({ queryKey: handoverKeys.detail(handoverId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        router.replace(`/warranty/${result.data.id}`);
      }
    },
  });
}

export function useUpdateWarrantyTicketAssignment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWarrantyTicketAssignmentInput) =>
      updateWarrantyTicketAssignmentAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useUpdateWarrantyTicketStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWarrantyTicketStatusInput) =>
      updateWarrantyTicketStatusAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useResolveWarrantyTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveWarrantyTicketInput) => resolveWarrantyTicketAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: warrantyTicketKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}
