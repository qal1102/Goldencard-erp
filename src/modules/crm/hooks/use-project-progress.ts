'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getProjectProgressForLeadAction,
  getProjectProgressForLeadsAction,
} from '../actions/project-progress.actions';

export const projectProgressKeys = {
  lead: (leadId: string) => ['project-progress', 'lead', leadId] as const,
  leads: (leadIds: string[]) =>
    ['project-progress', 'leads', [...leadIds].sort().join(',')] as const,
};

export function useProjectProgressForLead(leadId: string) {
  return useQuery({
    queryKey: projectProgressKeys.lead(leadId),
    queryFn: async () => {
      const result = await getProjectProgressForLeadAction(leadId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(leadId),
  });
}

export function useProjectProgressForLeads(leadIds: string[]) {
  return useQuery({
    queryKey: projectProgressKeys.leads(leadIds),
    queryFn: async () => {
      const result = await getProjectProgressForLeadsAction(leadIds);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: leadIds.length > 0,
    staleTime: 30 * 1000,
  });
}
