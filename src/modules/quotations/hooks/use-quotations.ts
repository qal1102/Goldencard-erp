'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { readLocalQueryCache, writeLocalQueryCache } from '@/lib/query/local-storage-cache';
import {
  createQuotationAction,
  getCompletedSurveysWithoutQuotationAction,
  getQuotationAction,
  getQuotationBySurveyIdAction,
  getQuotationsAction,
  updateQuotationAction,
  updateQuotationStatusAction,
} from '../actions/quotation.actions';
import type { QuotationRow } from '../lib/quotation.queries';
import type {
  CreateQuotationInput,
  QuotationFilters,
  UpdateQuotationInput,
  UpdateQuotationStatusInput,
} from '../schema/quotation.schema';

export function normalizeQuotationFilters(filters: QuotationFilters = {}): QuotationFilters {
  return {
    status: filters.status || undefined,
    customerId: filters.customerId || undefined,
  };
}

export function quotationListQueryKey(filters: QuotationFilters = {}) {
  const n = normalizeQuotationFilters(filters);
  return ['quotations', 'list', n.status ?? '', n.customerId ?? ''] as const;
}

export const quotationKeys = {
  all: ['quotations'] as const,
  list: quotationListQueryKey,
  detail: (id: string) => ['quotations', 'detail', id] as const,
  completedSurveys: () => ['quotations', 'completed-surveys'] as const,
  bySurvey: (surveyId: string) => ['quotations', 'by-survey', surveyId] as const,
};

function quotationLocalCacheKey(filters: QuotationFilters = {}) {
  const normalized = normalizeQuotationFilters(filters);
  return `quotations.list.${normalized.status ?? 'all'}.${normalized.customerId ?? 'all'}`;
}

type UseQuotationsOptions = {
  initialData?: QuotationRow[];
  enabled?: boolean;
};

export function useQuotations(filters: QuotationFilters = {}, options?: UseQuotationsOptions) {
  const normalized = normalizeQuotationFilters(filters);
  const cacheKey = quotationLocalCacheKey(normalized);
  const cachedInitialData = options?.initialData ?? readLocalQueryCache<QuotationRow[]>(cacheKey);

  return useQuery({
    queryKey: quotationKeys.list(normalized),
    queryFn: async () => {
      const result = await getQuotationsAction(normalized);
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

export function useQuotation(id: string) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: async () => {
      const result = await getQuotationAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useQuotationBySurvey(surveyId: string) {
  return useQuery({
    queryKey: quotationKeys.bySurvey(surveyId),
    queryFn: async () => {
      const result = await getQuotationBySurveyIdAction(surveyId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(surveyId),
  });
}

export function useCompletedSurveysWithoutQuotation() {
  return useQuery({
    queryKey: quotationKeys.completedSurveys(),
    queryFn: async () => {
      const result = await getCompletedSurveysWithoutQuotationAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateQuotationInput) => createQuotationAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.all });
        router.replace(`/quotations/${result.data.id}`);
      }
    },
  });
}

export function useUpdateQuotation(id: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => updateQuotationAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: quotationKeys.all });
        router.replace(`/quotations/${id}`);
      }
    },
  });
}

export function useUpdateQuotationStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateQuotationStatusInput) => updateQuotationStatusAction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
    },
  });
}
