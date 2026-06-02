'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createSurveyAction,
  getSurveyAction,
  getSurveysByCustomerAction,
  getSurveysAction,
  getTechnicianUsersAction,
  updateSurveyAction,
  updateSurveyAddressAction,
  checkInSurveyLocationAction,
  updateSurveyStatusAction,
} from '../actions/survey.actions';
import type {
  CreateSurveyInput,
  SurveyFilters,
  CheckInSurveyLocationInput,
  UpdateSurveyAddressInput,
  UpdateSurveyInput,
  UpdateSurveyStatusInput,
} from '../schema/survey.schema';

export const surveyKeys = {
  all: ['surveys'] as const,
  list: (filters?: SurveyFilters) => ['surveys', 'list', filters ?? {}] as const,
  detail: (id: string) => ['surveys', 'detail', id] as const,
  byCustomer: (customerId: string) => ['surveys', 'by-customer', customerId] as const,
  technicians: () => ['surveys', 'technicians'] as const,
};

export function useSurveys(filters: SurveyFilters = {}) {
  return useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: async () => {
      const result = await getSurveysAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: surveyKeys.detail(id),
    queryFn: async () => {
      const result = await getSurveyAction(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useSurveysByCustomer(customerId: string) {
  return useQuery({
    queryKey: surveyKeys.byCustomer(customerId),
    queryFn: async () => {
      const result = await getSurveysByCustomerAction(customerId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(customerId),
  });
}

export function useTechnicianUsers() {
  return useQuery({
    queryKey: surveyKeys.technicians(),
    queryFn: async () => {
      const result = await getTechnicianUsersAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreateSurveyInput) => createSurveyAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.all });
        router.push(`/surveys/${result.data.id}`);
        router.refresh();
      }
    },
  });
}

export function useUpdateSurvey(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSurveyInput) => updateSurveyAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: surveyKeys.all });
      }
    },
  });
}

export function useUpdateSurveyAddress(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSurveyAddressInput) => updateSurveyAddressAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: surveyKeys.all });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['quotations'] });
      }
    },
  });
}

export function useCheckInSurveyLocation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckInSurveyLocationInput) => checkInSurveyLocationAction(id, input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: surveyKeys.all });
      }
    },
  });
}

export function useUpdateSurveyStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSurveyStatusInput) => updateSurveyStatusAction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: surveyKeys.all });
    },
  });
}
