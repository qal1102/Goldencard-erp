'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import type {
  CreateWarrantyTicketInput,
  ResolveWarrantyTicketInput,
  UpdateWarrantyTicketAssignmentInput,
  UpdateWarrantyTicketStatusInput,
  WarrantyTicketFilters,
} from '../schema/warranty-ticket.schema';

export const warrantyTicketKeys = {
  all: ['warranty-tickets'] as const,
  list: (filters?: WarrantyTicketFilters) =>
    ['warranty-tickets', 'list', filters ?? {}] as const,
  detail: (id: string) => ['warranty-tickets', 'detail', id] as const,
  byHandover: (handoverId: string) => ['warranty-tickets', 'by-handover', handoverId] as const,
  byCustomer: (customerId: string) => ['warranty-tickets', 'by-customer', customerId] as const,
  assignableUsers: () => ['warranty-tickets', 'assignable-users'] as const,
};

export function useWarrantyTickets(filters: WarrantyTicketFilters = {}) {
  return useQuery({
    queryKey: warrantyTicketKeys.list(filters),
    queryFn: async () => {
      const result = await getWarrantyTicketsAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
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
