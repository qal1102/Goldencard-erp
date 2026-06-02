'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  convertLeadToCustomerAction,
  getCustomerAction,
  getCustomersAction,
  updateCustomerAddressAction,
} from '../actions/customer.actions';
import { leadKeys } from './use-leads';
import type {
  ConvertLeadInput,
  CustomerFilters,
  UpdateCustomerAddressInput,
} from '../schema/customer.schema';

export const customerKeys = {
  all: ['customers'] as const,
  list: (filters?: CustomerFilters) => ['customers', 'list', filters ?? {}] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const result = await getCustomersAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const result = await getCustomerAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useUpdateCustomerAddress(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomerAddressInput) =>
      updateCustomerAddressAction(customerId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useConvertLeadToCustomer(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConvertLeadInput) => convertLeadToCustomerAction(leadId, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
    },
  });
}
