'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  addLeadNoteAction,
  assignLeadAction,
  createLeadAction,
  getAssignableUsersAction,
  getLeadActivitiesAction,
  getLeadAction,
  getLeadsAction,
  updateLeadAction,
  updateLeadStatusAction,
} from '../actions/lead.actions';
import type {
  AddLeadNoteInput,
  CreateLeadInput,
  LeadFilters,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from '../schema/lead.schema';

export const leadKeys = {
  all: ['leads'] as const,
  list: (filters?: LeadFilters) => ['leads', 'list', filters ?? {}] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
  activities: (leadId: string) => ['leads', 'activities', leadId] as const,
  assignableUsers: () => ['leads', 'assignable-users'] as const,
};

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const result = await getLeadsAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async () => {
      const result = await getLeadAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: leadKeys.activities(leadId),
    queryFn: async () => {
      const result = await getLeadActivitiesAction(leadId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(leadId),
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: leadKeys.assignableUsers(),
    queryFn: async () => {
      const result = await getAssignableUsersAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLeadAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        router.push('/crm/leads');
        router.refresh();
      }
    },
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLeadInput) => updateLeadAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useUpdateLeadStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLeadStatusInput) => updateLeadStatusAction(id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: leadKeys.detail(id) });
      const previous = queryClient.getQueryData(leadKeys.detail(id));
      queryClient.setQueryData(leadKeys.detail(id), (old: { status: string } | undefined) =>
        old ? { ...old, status: input.status } : old,
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leadKeys.detail(id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useAssignLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignedTo: string | null) => assignLeadAction(id, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useAddLeadNote(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddLeadNoteInput) => addLeadNoteAction(leadId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
    },
  });
}
