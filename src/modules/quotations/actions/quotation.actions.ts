'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { quotationItems, quotations, surveys } from '@/db/schema';
import { requireRole } from '@/lib/auth/roles';
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TRANSITIONS,
  type CreateQuotationInput,
  type QuotationFilters,
  type QuotationStatus,
  type UpdateQuotationInput,
  type UpdateQuotationStatusInput,
  createQuotationSchema,
  quotationFiltersSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from '../schema/quotation.schema';
import {
  nextQuotationCode,
  queryCompletedSurveysWithoutQuotation,
  queryQuotationById,
  queryQuotationBySurveyId,
  queryQuotations,
} from '../lib/quotation.queries';

// ---------------------------------------------------------------------------
// Shared result type (mirrors pattern in survey.actions.ts)
// ---------------------------------------------------------------------------
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Role constants
// ---------------------------------------------------------------------------
const QUOTATION_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
] as const;

const QUOTATION_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
] as const;

const QUOTATION_APPROVE_ROLES = ['admin', 'director', 'chief_accountant'] as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

const toNull = (v: string | null | undefined): string | null =>
  v?.trim() ? v.trim() : null;

/**
 * All financial totals are computed here — never trusted from the client.
 *
 * discountType 'amount' → discountAmount = discountValue (capped at subtotal)
 * discountType 'percent' → discountAmount = subtotal × discountValue / 100
 * taxAmount = (subtotal - discountAmount) × vatRate / 100
 * grandTotal = (subtotal - discountAmount) + taxAmount
 */
function calculateTotals(
  items: { quantity: number; unitPrice: number }[],
  discountType: 'amount' | 'percent',
  discountValue: number,
  vatRate: number,
) {
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const lineTotals = items.map((item) => r2(item.quantity * item.unitPrice));
  const subtotal = r2(lineTotals.reduce((sum, t) => sum + t, 0));

  const discountAmount =
    discountType === 'amount'
      ? r2(Math.min(discountValue, subtotal))
      : r2((subtotal * discountValue) / 100);

  const taxableAmount = r2(subtotal - discountAmount);
  const taxAmount = r2((taxableAmount * vatRate) / 100);
  const grandTotal = r2(taxableAmount + taxAmount);

  return { lineTotals, subtotal, discountAmount, taxableAmount, taxAmount, grandTotal };
}

// ---------------------------------------------------------------------------
// createQuotationAction
// ---------------------------------------------------------------------------
export async function createQuotationAction(
  input: CreateQuotationInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);

    const parsed = createQuotationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const d = parsed.data;

    // Survey must exist and be completed
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, d.surveyId),
      with: { customer: true, lead: true },
    });
    if (!survey) return { success: false, error: 'Không tìm thấy phiếu khảo sát' };
    if (survey.status !== 'completed') {
      return {
        success: false,
        error: 'Chỉ có thể tạo báo giá từ phiếu khảo sát đã hoàn thành',
      };
    }

    // MVP: one quotation per survey
    const existing = await queryQuotationBySurveyId(d.surveyId);
    if (existing) {
      return { success: false, error: 'Phiếu khảo sát này đã có báo giá' };
    }

    // Snapshot source: customer takes priority; fall back to lead for lead-origin surveys
    const customer = survey.customer;
    const lead = survey.lead;
    if (!customer && !lead) {
      return { success: false, error: 'Phiếu khảo sát chưa liên kết với khách hàng hoặc lead' };
    }

    const snapshotName = customer?.fullName ?? lead!.fullName;
    const snapshotPhone = customer?.phone ?? lead!.phone ?? null;
    const snapshotAddress = customer?.address ?? lead!.address ?? null;

    const { lineTotals, subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(
      d.items,
      d.discountType,
      d.discountValue,
      d.vatRate,
    );

    // Generate the code before the transaction — sequences never roll back in
    // PostgreSQL, so a gap is possible on retry but the code is always unique.
    const code = await nextQuotationCode();

    const quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(quotations)
        .values({
          code,
          // null when lead-origin (no customer yet); filled after lead conversion
          customerId: customer?.id ?? null,
          surveyId: d.surveyId,
          status: 'draft',
          validUntil: d.validUntil?.trim() || null,
          note: toNull(d.note),
          // Snapshot fields — written once at creation, never updated
          customerNameSnapshot: snapshotName,
          customerPhoneSnapshot: snapshotPhone,
          customerAddressSnapshot: snapshotAddress,
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          createdBy: session.user.id,
        })
        .returning({ id: quotations.id, code: quotations.code });

      if (!row) throw new Error('Không thể tạo báo giá');

      await tx.insert(quotationItems).values(
        d.items.map((item, idx) => ({
          quotationId: row.id,
          sortOrder: idx,
          productName: item.productName,
          description: toNull(item.description),
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (lineTotals[idx] ?? 0).toFixed(2),
        })),
      );

      return row;
    });

    revalidatePath('/quotations');
    revalidatePath(`/surveys/${d.surveyId}`);
    return { success: true, data: { id: quotation.id, code: quotation.code } };
  } catch (e) {
    console.error('[createQuotationAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// getQuotationsAction
// ---------------------------------------------------------------------------
export async function getQuotationsAction(
  filters: QuotationFilters = {},
): Promise<ActionResult<Awaited<ReturnType<typeof queryQuotations>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_VIEW_ROLES);

    const parsed = quotationFiltersSchema.safeParse(filters);
    const safeFilters = parsed.success ? parsed.data : {};

    const data = await queryQuotations(safeFilters);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// getQuotationAction
// ---------------------------------------------------------------------------
export async function getQuotationAction(
  id: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryQuotationById>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_VIEW_ROLES);

    const data = await queryQuotationById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// updateQuotationAction — draft only; snapshot fields are never touched
// ---------------------------------------------------------------------------
export async function updateQuotationAction(
  id: string,
  input: UpdateQuotationInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);

    const parsed = updateQuotationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryQuotationById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy báo giá' };
    if (existing.status !== 'draft') {
      return { success: false, error: 'Chỉ có thể chỉnh sửa báo giá ở trạng thái nháp' };
    }

    const d = parsed.data;
    const { lineTotals, subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(
      d.items,
      d.discountType,
      d.discountValue,
      d.vatRate,
    );

    await db.transaction(async (tx) => {
      // Replace all items (delete + re-insert keeps it simple)
      await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));

      await tx.insert(quotationItems).values(
        d.items.map((item, idx) => ({
          quotationId: id,
          sortOrder: idx,
          productName: item.productName,
          description: toNull(item.description),
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (lineTotals[idx] ?? 0).toFixed(2),
        })),
      );

      // Snapshot fields are intentionally excluded from this update
      await tx
        .update(quotations)
        .set({
          validUntil: d.validUntil?.trim() || null,
          note: toNull(d.note),
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));
    });

    revalidatePath('/quotations');
    revalidatePath(`/quotations/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateQuotationAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// updateQuotationStatusAction
// ---------------------------------------------------------------------------
export async function updateQuotationStatusAction(
  id: string,
  input: UpdateQuotationStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    const sessionRoles = session.user.roles ?? [];

    const parsed = updateQuotationStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const { status: newStatus } = parsed.data;

    const existing = await queryQuotationById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy báo giá' };

    const currentStatus = existing.status as QuotationStatus;
    const allowed = QUOTATION_STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ "${QUOTATION_STATUS_LABELS[currentStatus]}" sang "${QUOTATION_STATUS_LABELS[newStatus]}"`,
      };
    }

    // Sending requires write role; accepting / rejecting / expiring requires approve role
    const isApproveAction = (['accepted', 'rejected', 'expired'] as QuotationStatus[]).includes(
      newStatus,
    );
    if (isApproveAction) {
      requireRole(sessionRoles, ...QUOTATION_APPROVE_ROLES);
    } else {
      requireRole(sessionRoles, ...QUOTATION_WRITE_ROLES);
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedBy: session.user.id,
      updatedAt: now,
    };

    if (newStatus === 'accepted') {
      updates.acceptedAt = now;
      updates.acceptedBy = session.user.id;
    }

    await db.update(quotations).set(updates).where(eq(quotations.id, id));

    revalidatePath('/quotations');
    revalidatePath(`/quotations/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateQuotationStatusAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// getQuotationBySurveyIdAction
// ---------------------------------------------------------------------------
export async function getQuotationBySurveyIdAction(
  surveyId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof queryQuotationBySurveyId>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_VIEW_ROLES);
    const data = await queryQuotationBySurveyId(surveyId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// getCompletedSurveysWithoutQuotationAction
// ---------------------------------------------------------------------------
export async function getCompletedSurveysWithoutQuotationAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof queryCompletedSurveysWithoutQuotation>>>
> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);
    const data = await queryCompletedSurveysWithoutQuotation();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}
