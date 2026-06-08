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
  recordCallAttemptAction,
  submitCallResultAction,
  updateLeadAction,
  updateLeadInstallationAddressAction,
  updateLeadStatusAction,
} from '../actions/lead.actions';
import type { UpdateAddressInput } from '@/lib/address/address.schema';
import type {
  AddLeadNoteInput,
  CreateLeadInput,
  LeadFilters,
  SubmitCallResultInput,
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
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useCreateLead() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLeadAction(input),
    onSuccess: (result) => {
      if (!result.success) return;

      const leadId = result.data.id;
      if (!UUID_RE.test(leadId)) {
        console.error('[useCreateLead] Invalid lead id after create:', leadId);
        return;
      }

      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      const params = new URLSearchParams();
      if (result.data.linkedExistingCustomer) {
        params.set('linkedCustomer', result.data.customerCode);
      } else if (result.data.customerAutoCreated) {
        params.set('customerCreated', result.data.customerCode);
      }
      const query = params.toString();
      router.replace(`/crm/leads/${leadId}${query ? `?${query}` : ''}`);
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

export function useUpdateLeadInstallationAddress(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAddressInput) => updateLeadInstallationAddressAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['surveys'] });
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

export function useRecordCallAttempt(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recordCallAttemptAction(leadId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useSubmitCallResult(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitCallResultInput) => submitCallResultAction(leadId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.activities(leadId) });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}
