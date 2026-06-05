'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { leadKeys } from '@/modules/crm/hooks/use-leads';
import { quotationKeys } from '@/modules/quotations/hooks/use-quotations';
import {
  createContractFromQuotationAction,
  getContractAction,
  getContractByQuotationIdAction,
  getContractsAction,
  updateContractInfoAction,
  updateContractNoteAction,
  updateContractStatusAction,
} from '../actions/contract.actions';
import type { ContractRow } from '../lib/contract.queries';
import type {
  ContractFilters,
  CreateContractFromQuotationInput,
  UpdateContractInfoInput,
  UpdateContractNoteInput,
  UpdateContractStatusInput,
} from '../schema/contract.schema';

export function normalizeContractFilters(filters: ContractFilters = {}): ContractFilters {
  return {
    status: filters.status || undefined,
    customerId: filters.customerId || undefined,
  };
}

export function contractListQueryKey(filters: ContractFilters = {}) {
  const n = normalizeContractFilters(filters);
  return ['contracts', 'list', n.status ?? '', n.customerId ?? ''] as const;
}

export const contractKeys = {
  all: ['contracts'] as const,
  list: contractListQueryKey,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  byQuotation: (quotationId: string) => ['contracts', 'by-quotation', quotationId] as const,
};

type UseContractsOptions = {
  initialData?: ContractRow[];
  enabled?: boolean;
};

export function useContracts(filters: ContractFilters = {}, options?: UseContractsOptions) {
  const normalized = normalizeContractFilters(filters);

  return useQuery({
    queryKey: contractKeys.list(normalized),
    queryFn: async () => {
      const result = await getContractsAction(normalized);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData: options?.initialData,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: options?.initialData === undefined,
    refetchOnWindowFocus: false,
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: async () => {
      const result = await getContractAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useContractByQuotation(quotationId: string, enabled = true) {
  return useQuery({
    queryKey: contractKeys.byQuotation(quotationId),
    queryFn: async () => {
      const result = await getContractByQuotationIdAction(quotationId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(quotationId) && enabled,
  });
}

export function useCreateContractFromQuotation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateContractFromQuotationInput) =>
      createContractFromQuotationAction(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: contractKeys.all });
        queryClient.invalidateQueries({
          queryKey: contractKeys.byQuotation(variables.quotationId),
        });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(variables.quotationId) });
        router.replace(`/contracts/${result.data.id}`);
      }
    },
  });
}

export function useUpdateContractStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateContractStatusInput) => updateContractStatusAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: contractKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useUpdateContractNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateContractNoteInput) => updateContractNoteAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
      }
    },
  });
}

export function useUpdateContractInfo(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateContractInfoInput) => updateContractInfoAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: contractKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}
