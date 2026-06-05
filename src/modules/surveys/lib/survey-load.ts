import 'server-only';

import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { surveyFiltersSchema, type SurveyFilters } from '../schema/survey.schema';
import { querySurveys, querySurveysForTechnician } from './survey.queries';

export async function loadSurveysList(
  filters: SurveyFilters = {},
  roles: string[] = [],
  userId = '',
) {
  const started = Date.now();
  devModuleLog('surveys', 'list query start', { filters });

  try {
    const parsed = surveyFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const isTechnicianOnly =
      hasRole(roles, 'technician') && !hasRole(roles, 'admin', 'director', 'sales');

    const data = serializeForClient(
      isTechnicianOnly
        ? await querySurveysForTechnician(userId, parsed.data.status)
        : await querySurveys(parsed.data),
    );
    devModuleLog('surveys', 'list query ok', { ms: Date.now() - started, count: data.length });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('surveys', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
