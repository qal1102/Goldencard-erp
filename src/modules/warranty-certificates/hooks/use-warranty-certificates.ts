'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createWarrantyCertificateFromHandoverAction,
  getWarrantyCertificateAction,
  getWarrantyCertificateByHandoverAction,
  getWarrantyCertificatesAction,
  getWarrantyCertificatesByCustomerAction,
} from '../actions/warranty-certificate.actions';
import type { WarrantyCertificateFilters } from '../schema/warranty-certificate.schema';

export const warrantyCertificateKeys = {
  all: ['warranty-certificates'] as const,
  list: (filters?: WarrantyCertificateFilters) =>
    ['warranty-certificates', 'list', filters ?? {}] as const,
  detail: (id: string) => ['warranty-certificates', 'detail', id] as const,
  byHandover: (handoverId: string) =>
    ['warranty-certificates', 'by-handover', handoverId] as const,
  byCustomer: (customerId: string) =>
    ['warranty-certificates', 'by-customer', customerId] as const,
};

export function useWarrantyCertificates(filters: WarrantyCertificateFilters = {}) {
  return useQuery({
    queryKey: warrantyCertificateKeys.list(filters),
    queryFn: async () => {
      const result = await getWarrantyCertificatesAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useWarrantyCertificate(id: string) {
  return useQuery({
    queryKey: warrantyCertificateKeys.detail(id),
    queryFn: async () => {
      const result = await getWarrantyCertificateAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useWarrantyCertificateByHandover(handoverId: string, enabled = true) {
  return useQuery({
    queryKey: warrantyCertificateKeys.byHandover(handoverId),
    queryFn: async () => {
      const result = await getWarrantyCertificateByHandoverAction(handoverId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: enabled && Boolean(handoverId),
  });
}

export function useWarrantyCertificatesByCustomer(customerId: string) {
  return useQuery({
    queryKey: warrantyCertificateKeys.byCustomer(customerId),
    queryFn: async () => {
      const result = await getWarrantyCertificatesByCustomerAction(customerId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(customerId),
  });
}

export function useCreateWarrantyCertificateFromHandover() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (handoverId: string) =>
      createWarrantyCertificateFromHandoverAction(handoverId),
    onSuccess: (result, handoverId) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: warrantyCertificateKeys.all });
        queryClient.invalidateQueries({
          queryKey: warrantyCertificateKeys.byHandover(handoverId),
        });
        router.replace(`/warranty-certificates/${result.data.id}`);
      }
    },
  });
}
