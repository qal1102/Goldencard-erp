'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { warrantyCertificates } from '@/db/schema';
import { createAuditLog } from '@/lib/audit/create-audit-log';
import { WARRANTY_SUPPORT_HOTLINE } from '../lib/support-phone';
import { requireRole } from '@/lib/auth/roles';
import { serializeForClient } from '@/lib/serialize/for-client';
import { devModuleLogError, MODULE_LIST_ERROR } from '@/lib/server/module-list-log';
import { queryHandoverById } from '@/modules/handovers/lib/handover.queries';
import {
  DEFAULT_WARRANTY_TERMS,
  warrantyCertificateFiltersSchema,
  type WarrantyCertificateFilters,
} from '../schema/warranty-certificate.schema';
import { addMonths } from '../lib/warranty-certificate-status';
import { generateWarrantyPublicToken } from '../lib/public-token';
import {
  nextWarrantyCertificateCode,
  queryWarrantyCertificateByHandoverId,
  queryWarrantyCertificateById,
  queryWarrantyCertificates,
  queryWarrantyCertificatesByCustomerId,
} from '../lib/warranty-certificate.queries';
import { loadWarrantyCertificateDetail } from '../lib/warranty-certificate-load';
import { type WarrantyCertificateQrStats } from '../lib/warranty-qr-support';

export type WarrantyCertificateDetailWithQrStats = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyCertificateById>>
> & { qrRequestStats: WarrantyCertificateQrStats };

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const CERT_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

const CERT_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'customer_service',
] as const;

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

function revalidateCertificatePaths(
  certificateId: string,
  options?: { customerId?: string; handoverId?: string },
) {
  revalidatePath('/warranty-certificates');
  revalidatePath(`/warranty-certificates/${certificateId}`);
  revalidatePath(`/warranty-certificates/${certificateId}/print`);
  if (options?.handoverId) {
    revalidatePath(`/handovers/${options.handoverId}`);
    revalidatePath('/handovers');
  }
  if (options?.customerId) {
    revalidatePath(`/crm/customers/${options.customerId}`);
    revalidatePath('/crm/customers');
  }
}

export async function getWarrantyCertificatesAction(
  filters: WarrantyCertificateFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyCertificates>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CERT_VIEW_ROLES);

    const parsed = warrantyCertificateFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: 'Bộ lọc không hợp lệ' };
    }

    const data = serializeForClient(await queryWarrantyCertificates(parsed.data));
    return { success: true, data };
  } catch (e) {
    devModuleLogError('warranty-certificates', 'getWarrantyCertificatesAction failed', e);
    return {
      success: false,
      error:
        e instanceof Error && e.message !== 'Unauthorized'
          ? MODULE_LIST_ERROR
          : e instanceof Error
            ? e.message
            : MODULE_LIST_ERROR,
    };
  }
}

export async function getWarrantyCertificateAction(
  id: string,
): Promise<ActionResult<WarrantyCertificateDetailWithQrStats>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CERT_VIEW_ROLES);

    const loadResult = await loadWarrantyCertificateDetail(id, session.user.roles ?? []);
    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }

    const data = loadResult.data;

    return { success: true, data };
  } catch (e) {
    devModuleLogError('warranty-certificates', 'getWarrantyCertificateAction failed', e);
    return {
      success: false,
      error:
        e instanceof Error && e.message !== 'Unauthorized'
          ? MODULE_LIST_ERROR
          : e instanceof Error
            ? e.message
            : MODULE_LIST_ERROR,
    };
  }
}

export async function getWarrantyCertificateByHandoverAction(
  handoverId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyCertificateByHandoverId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CERT_VIEW_ROLES);
    const data = await queryWarrantyCertificateByHandoverId(handoverId);
    return { success: true, data: data ?? undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function getWarrantyCertificatesByCustomerAction(
  customerId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryWarrantyCertificatesByCustomerId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CERT_VIEW_ROLES);
    const data = await queryWarrantyCertificatesByCustomerId(customerId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

export async function createWarrantyCertificateFromHandoverAction(
  handoverId: string,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...CERT_WRITE_ROLES);

    const handover = await queryHandoverById(handoverId);
    if (!handover) return { success: false, error: 'Không tìm thấy phiếu bàn giao' };
    if (handover.status !== 'completed') {
      return { success: false, error: 'Chỉ tạo phiếu bảo hành khi phiếu bàn giao đã hoàn tất' };
    }

    const existing = await queryWarrantyCertificateByHandoverId(handoverId);
    if (existing) {
      return {
        success: false,
        error: `Phiếu bảo hành ${existing.code} đã tồn tại cho biên bản bàn giao này`,
      };
    }

    const warrantyStartAt = handover.handoverAt ?? new Date();
    const warrantyEndAt = addMonths(new Date(warrantyStartAt), 12);

    const code = await nextWarrantyCertificateCode();
    const publicToken = generateWarrantyPublicToken();

    const [certificate] = await db
      .insert(warrantyCertificates)
      .values({
        code,
        publicToken,
        customerId: handover.customerId,
        leadId: handover.leadId,
        surveyId: handover.surveyId,
        quotationId: handover.quotationId,
        contractId: handover.contractId,
        workOrderId: handover.workOrderId,
        handoverId: handover.id,
        status: 'active',
        warrantyStartAt,
        warrantyEndAt,
        warrantyTerms: DEFAULT_WARRANTY_TERMS,
        supportPhone: WARRANTY_SUPPORT_HOTLINE,
        createdBy: session.user.id,
      })
      .returning({ id: warrantyCertificates.id, code: warrantyCertificates.code });

    if (!certificate) {
      return { success: false, error: 'Không thể tạo phiếu bảo hành' };
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'warranty_certificate.create',
      resource: 'warranty_certificate',
      resourceId: certificate.id,
      summary: `Tạo phiếu bảo hành ${certificate.code} từ bàn giao ${handover.code}`,
      after: { handoverId: handover.id, customerId: handover.customerId },
    });

    revalidateCertificatePaths(certificate.id, {
      customerId: handover.customerId,
      handoverId: handover.id,
    });

    return { success: true, data: { id: certificate.id, code: certificate.code } };
  } catch (e) {
    console.error('[createWarrantyCertificateFromHandoverAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
