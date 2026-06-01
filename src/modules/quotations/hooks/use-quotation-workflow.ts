'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createQuotationRevisionAction,
  markQuotationSentAction,
  recordQuotationResponseAction,
} from '../actions/quotation.actions';
import type {
  MarkQuotationSentInput,
  RecordQuotationResponseInput,
} from '../schema/quotation.schema';
import { quotationKeys } from './use-quotations';

export function useMarkQuotationSent(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MarkQuotationSentInput) =>
      markQuotationSentAction(quotationId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
        queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      }
    },
  });
}

export function useRecordQuotationResponse(quotationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordQuotationResponseInput) =>
      recordQuotationResponseAction(quotationId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
        queryClient.invalidateQueries({ queryKey: quotationKeys.all });
      }
    },
  });
}

export function useCreateQuotationRevision(sourceQuotationId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => createQuotationRevisionAction(sourceQuotationId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: quotationKeys.all });
        router.push(`/quotations/${result.data.id}/edit`);
      }
    },
  });
}

export function useDownloadQuotationExcel(quotationId: string, filename: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/quotations/${quotationId}/export?format=xlsx`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Không thể tải báo giá');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.all });
    },
  });
}
