import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { warrantyCertificates } from '@/db/schema';
import { hasRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLog, devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import {
  warrantyCertificateFiltersSchema,
  type WarrantyCertificateFilters,
} from '../schema/warranty-certificate.schema';
import {
  queryWarrantyCertificateById,
  queryWarrantyCertificates,
} from './warranty-certificate.queries';
import { generateWarrantyPublicToken } from './public-token';
import {
  queryWarrantyCertificateQrStats,
  type WarrantyCertificateQrStats,
} from './warranty-qr-support';

export type LoadedWarrantyCertificateDetail = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyCertificateById>>
> & { qrRequestStats: WarrantyCertificateQrStats };

const VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

export async function loadWarrantyCertificatesList(
  filters: WarrantyCertificateFilters = {},
  roles: string[] = [],
) {
  const started = Date.now();
  devModuleLog('warranty-certificates', 'list query start', { filters });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem phiếu bảo hành.' };
    }

    const parsed = warrantyCertificateFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false as const, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryWarrantyCertificates(parsed.data));
    devModuleLog('warranty-certificates', 'list query ok', {
      ms: Date.now() - started,
      count: data.length,
    });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('warranty-certificates', 'list query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}

export async function loadWarrantyCertificateDetail(id: string, roles: string[] = []) {
  const started = Date.now();
  devModuleLog('warranty-certificates', 'detail query start', { id });

  try {
    if (!hasRole(roles, ...VIEW_ROLES)) {
      return { success: false as const, error: 'Bạn không có quyền xem phiếu bảo hành.' };
    }

    let certificate = await queryWarrantyCertificateById(id);
    if (!certificate) {
      return { success: false as const, error: 'Không tìm thấy phiếu bảo hành' };
    }

    if (!certificate.publicToken?.trim()) {
      const publicToken = generateWarrantyPublicToken();
      await db
        .update(warrantyCertificates)
        .set({ publicToken, updatedAt: new Date() })
        .where(eq(warrantyCertificates.id, certificate.id));
      certificate = { ...certificate, publicToken };
    }

    const qrRequestStats = await queryWarrantyCertificateQrStats(
      certificate.handoverId,
      certificate.code,
    );

    const data = serializeForClient({
      ...certificate,
      qrRequestStats,
    }) as LoadedWarrantyCertificateDetail;

    devModuleLog('warranty-certificates', 'detail query ok', {
      ms: Date.now() - started,
      code: certificate.code,
    });
    return { success: true as const, data };
  } catch (error) {
    devModuleLogError('warranty-certificates', 'detail query failed', error);
    return { success: false as const, error: MODULE_LIST_ERROR };
  }
}
