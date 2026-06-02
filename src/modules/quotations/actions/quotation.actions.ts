'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { quotationEditLogs, quotationExports, quotationItems, quotations, surveys } from '@/db/schema';
import { requireRole } from '@/lib/auth/roles';
import { safeNotify } from '@/lib/notifications/create-notification';
import {
  notifyQuotationCreated,
  notifyQuotationEditedAfterSent,
  notifyQuotationResponse,
  notifyQuotationSent,
} from '@/lib/notifications/events/quotation-events';
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TRANSITIONS,
  REVISION_SOURCE_STATUSES,
  type CreateQuotationInput,
  type MarkQuotationSentInput,
  type QuotationFilters,
  type QuotationStatus,
  type RecordQuotationExportInput,
  type RecordQuotationResponseInput,
  type RevisionSourceStatus,
  type UpdateQuotationInput,
  type UpdateQuotationStatusInput,
  createQuotationSchema,
  markQuotationSentSchema,
  quotationFiltersSchema,
  recordQuotationExportSchema,
  recordQuotationResponseSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from '../schema/quotation.schema';
import {
  nextQuotationCode,
  queryAcceptedQuotationBySurveyId,
  queryCompletedSurveysWithoutQuotation,
  queryMaxRevisionNumber,
  queryQuotationById,
  queryQuotationDetailById,
  queryQuotationBySurveyId,
  queryQuotationExportCount,
  queryQuotations,
  querySurveyHasQuotation,
} from '../lib/quotation.queries';
import {
  computeLatestEditAt,
  computeNeedsResend,
  isQuotationEditable,
} from '../lib/quotation-resend';

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

function revalidateQuotationPaths(quotationId: string, surveyId?: string | null) {
  revalidatePath('/quotations');
  revalidatePath(`/quotations/${quotationId}`);
  if (surveyId) revalidatePath(`/surveys/${surveyId}`);
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

    const hasQuotation = await querySurveyHasQuotation(d.surveyId);
    if (hasQuotation) {
      return { success: false, error: 'Phiếu khảo sát này đã có báo giá' };
    }

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

    const code = await nextQuotationCode();

    const quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(quotations)
        .values({
          code,
          customerId: customer?.id ?? null,
          surveyId: d.surveyId,
          revisionNumber: 1,
          status: 'draft',
          validUntil: d.validUntil?.trim() || null,
          note: toNull(d.note),
          customerNameSnapshot: snapshotName,
          customerPhoneSnapshot: snapshotPhone,
          customerAddressSnapshot: snapshotAddress,
          discountType: d.discountType,
          discountValue: d.discountValue.toFixed(2),
          vatRate: d.vatRate.toFixed(2),
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

    revalidateQuotationPaths(quotation.id, d.surveyId);

    await safeNotify(() =>
      notifyQuotationCreated({
        quotationId: quotation.id,
        quotationCode: quotation.code,
        leadId: survey.leadId,
        actorUserId: session.user.id,
      }),
    );

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
): Promise<ActionResult<Awaited<ReturnType<typeof queryQuotationDetailById>>>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_VIEW_ROLES);

    const data = await queryQuotationDetailById(id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// updateQuotationAction — draft or sent; snapshots never touched
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

    const existingStatus = existing.status as QuotationStatus;
    if (!isQuotationEditable(existingStatus)) {
      if (existingStatus === 'accepted') {
        return { success: false, error: 'Báo giá đã được khách chấp nhận — không thể chỉnh sửa' };
      }
      return {
        success: false,
        error: 'Không thể chỉnh sửa trực tiếp ở trạng thái này. Hãy tạo bản chỉnh sửa mới.',
      };
    }

    const d = parsed.data;
    const isSentEdit = existingStatus === 'sent';

    if (isSentEdit) {
      const editNote = d.editNote?.trim() ?? '';
      if (editNote.length < 5) {
        return {
          success: false,
          error: 'Cần ghi chú tóm tắt thay đổi (ít nhất 5 ký tự) khi sửa báo giá đã gửi',
        };
      }
    }

    const beforeTotal = existing.grandTotal;
    const { lineTotals, subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(
      d.items,
      d.discountType,
      d.discountValue,
      d.vatRate,
    );

    const now = new Date();

    await db.transaction(async (tx) => {
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

      await tx
        .update(quotations)
        .set({
          validUntil: d.validUntil?.trim() || null,
          note: toNull(d.note),
          discountType: d.discountType,
          discountValue: d.discountValue.toFixed(2),
          vatRate: d.vatRate.toFixed(2),
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          updatedBy: session.user.id,
          updatedAt: now,
        })
        .where(eq(quotations.id, id));

      if (isSentEdit) {
        await tx.insert(quotationEditLogs).values({
          quotationId: id,
          editedBy: session.user.id,
          editedAt: now,
          note: d.editNote!.trim(),
          beforeTotal: beforeTotal,
          afterTotal: grandTotal.toFixed(2),
          beforeStatus: existingStatus,
          afterStatus: existingStatus,
        });
      }
    });

    if (isSentEdit) {
      const survey = await db.query.surveys.findFirst({
        where: eq(surveys.id, existing.surveyId),
        columns: { leadId: true },
      });
      await safeNotify(() =>
        notifyQuotationEditedAfterSent({
          quotationId: id,
          quotationCode: existing.code,
          leadId: survey?.leadId,
          quotationCreatedBy: existing.createdBy,
          actorUserId: session.user.id,
        }),
      );
    }

    revalidateQuotationPaths(id, existing.surveyId);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[updateQuotationAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// recordQuotationExportAction
// ---------------------------------------------------------------------------
export async function recordQuotationExportAction(
  id: string,
  input: RecordQuotationExportInput,
): Promise<ActionResult<{ exportCount: number }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);

    const parsed = recordQuotationExportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryQuotationById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy báo giá' };

    const now = new Date();

    await db.insert(quotationExports).values({
      quotationId: id,
      format: parsed.data.format,
      exportedBy: session.user.id,
      exportedAt: now,
    });

    const exportCount = await queryQuotationExportCount(id);
    revalidateQuotationPaths(id, existing.surveyId);
    return { success: true, data: { exportCount } };
  } catch (e) {
    console.error('[recordQuotationExportAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// markQuotationSentAction
// ---------------------------------------------------------------------------
export async function markQuotationSentAction(
  id: string,
  input: MarkQuotationSentInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);

    const parsed = markQuotationSentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryQuotationById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy báo giá' };

    const existingStatus = existing.status as QuotationStatus;
    const latestEditAt = computeLatestEditAt(existing.editLogs ?? []);
    const needsResend = computeNeedsResend({
      status: existingStatus,
      sentAt: existing.sentAt,
      latestEditAt,
    });

    const exportCount = await queryQuotationExportCount(id);
    if (exportCount < 1) {
      return {
        success: false,
        error: 'Phải xuất báo giá ít nhất một lần trước khi đánh dấu đã gửi cho khách',
      };
    }

    const isInitialSend = existingStatus === 'draft';
    const isResend = existingStatus === 'sent' && needsResend;

    if (!isInitialSend && !isResend) {
      if (existingStatus === 'sent') {
        return { success: false, error: 'Báo giá đã được gửi và chưa có chỉnh sửa cần gửi lại' };
      }
      return { success: false, error: 'Chỉ có thể đánh dấu đã gửi khi báo giá ở trạng thái nháp hoặc cần gửi lại' };
    }

    const now = new Date();
    await db
      .update(quotations)
      .set({
        status: 'sent',
        sentAt: now,
        sentBy: session.user.id,
        sentChannel: parsed.data.sentChannel,
        sentNote: toNull(parsed.data.sentNote),
        updatedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(quotations.id, id));

    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, existing.surveyId),
      columns: { leadId: true },
    });

    await safeNotify(() =>
      notifyQuotationSent({
        quotationId: id,
        quotationCode: existing.code,
        leadId: survey?.leadId,
        actorUserId: session.user.id,
      }),
    );

    revalidateQuotationPaths(id, existing.surveyId);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[markQuotationSentAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// recordQuotationResponseAction
// ---------------------------------------------------------------------------
export async function recordQuotationResponseAction(
  id: string,
  input: RecordQuotationResponseInput,
): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_APPROVE_ROLES);

    const parsed = recordQuotationResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const existing = await queryQuotationById(id);
    if (!existing) return { success: false, error: 'Không tìm thấy báo giá' };
    if (existing.status !== 'sent') {
      return {
        success: false,
        error: 'Chỉ có thể ghi nhận phản hồi khách khi báo giá đã được gửi',
      };
    }

    const latestEditAt = computeLatestEditAt(existing.editLogs ?? []);
    const needsResend = computeNeedsResend({
      status: existing.status,
      sentAt: existing.sentAt,
      latestEditAt,
    });
    if (needsResend) {
      return {
        success: false,
        error:
          'Báo giá đã được chỉnh sửa sau lần gửi cuối — cần xuất và đánh dấu gửi lại trước khi ghi nhận phản hồi',
      };
    }

    const { status: responseStatus, responseNote } = parsed.data;

    if (responseStatus === 'accepted') {
      const otherAccepted = await queryAcceptedQuotationBySurveyId(existing.surveyId, id);
      if (otherAccepted) {
        return {
          success: false,
          error: `Khảo sát này đã có báo giá được chấp nhận (${otherAccepted.code} · v${otherAccepted.revisionNumber})`,
        };
      }
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: responseStatus,
      responseNote: toNull(responseNote),
      respondedAt: now,
      respondedBy: session.user.id,
      updatedBy: session.user.id,
      updatedAt: now,
    };

    if (responseStatus === 'accepted') {
      updates.acceptedAt = now;
      updates.acceptedBy = session.user.id;
    }

    await db.update(quotations).set(updates).where(eq(quotations.id, id));

    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, existing.surveyId),
      columns: { leadId: true },
    });

    await safeNotify(() =>
      notifyQuotationResponse({
        quotationId: id,
        quotationCode: existing.code,
        leadId: survey?.leadId,
        quotationCreatedBy: existing.createdBy,
        responseStatus,
        actorUserId: session.user.id,
      }),
    );

    revalidateQuotationPaths(id, existing.surveyId);
    return { success: true, data: undefined };
  } catch (e) {
    console.error('[recordQuotationResponseAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// createQuotationRevisionAction
// ---------------------------------------------------------------------------
export async function createQuotationRevisionAction(
  sourceQuotationId: string,
): Promise<ActionResult<{ id: string; code: string; revisionNumber: number }>> {
  try {
    const session = await getSessionOrThrow();
    requireRole(session.user.roles ?? [], ...QUOTATION_WRITE_ROLES);

    const source = await queryQuotationById(sourceQuotationId);
    if (!source) return { success: false, error: 'Không tìm thấy báo giá' };

    const sourceStatus = source.status as QuotationStatus;
    if (!REVISION_SOURCE_STATUSES.includes(sourceStatus as RevisionSourceStatus)) {
      return {
        success: false,
        error: `Không thể tạo bản chỉnh sửa từ trạng thái "${QUOTATION_STATUS_LABELS[sourceStatus]}"`,
      };
    }

    const activeDraft = await db.query.quotations.findFirst({
      where: and(eq(quotations.surveyId, source.surveyId), eq(quotations.status, 'draft')),
      columns: { id: true, revisionNumber: true },
    });
    if (activeDraft) {
      return {
        success: false,
        error: `Đã có bản nháp v${activeDraft.revisionNumber} đang chờ xử lý`,
      };
    }

    const nextRevision = (await queryMaxRevisionNumber(source.surveyId)) + 1;

    const revision = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(quotations)
        .values({
          code: source.code,
          customerId: source.customerId,
          surveyId: source.surveyId,
          revisionNumber: nextRevision,
          status: 'draft',
          validUntil: source.validUntil,
          note: source.note,
          customerNameSnapshot: source.customerNameSnapshot,
          customerPhoneSnapshot: source.customerPhoneSnapshot,
          customerAddressSnapshot: source.customerAddressSnapshot,
          discountType: source.discountType,
          discountValue: source.discountValue,
          vatRate: source.vatRate,
          subtotal: source.subtotal,
          discountAmount: source.discountAmount,
          taxAmount: source.taxAmount,
          grandTotal: source.grandTotal,
          contentLockedAt: null,
          sentAt: null,
          sentBy: null,
          sentChannel: null,
          sentNote: null,
          responseNote: null,
          respondedAt: null,
          respondedBy: null,
          acceptedAt: null,
          acceptedBy: null,
          createdBy: session.user.id,
        })
        .returning({
          id: quotations.id,
          code: quotations.code,
          revisionNumber: quotations.revisionNumber,
        });

      if (!row) throw new Error('Không thể tạo bản chỉnh sửa báo giá');

      const items = source.items ?? [];
      if (items.length > 0) {
        await tx.insert(quotationItems).values(
          items.map((item) => ({
            quotationId: row.id,
            sortOrder: item.sortOrder,
            productName: item.productName,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        );
      }

      return row;
    });

    revalidateQuotationPaths(revision.id, source.surveyId);
    return {
      success: true,
      data: {
        id: revision.id,
        code: revision.code,
        revisionNumber: revision.revisionNumber,
      },
    };
  } catch (e) {
    console.error('[createQuotationRevisionAction]', e);
    return { success: false, error: e instanceof Error ? e.message : 'Lỗi hệ thống' };
  }
}

// ---------------------------------------------------------------------------
// updateQuotationStatusAction (legacy — prefer dedicated workflow actions)
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

    const isApproveAction = (
      ['accepted', 'rejected', 'needs_revision', 'no_response', 'expired'] as QuotationStatus[]
    ).includes(newStatus);
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
      const otherAccepted = await queryAcceptedQuotationBySurveyId(existing.surveyId, id);
      if (otherAccepted) {
        return {
          success: false,
          error: `Khảo sát này đã có báo giá được chấp nhận (${otherAccepted.code} · v${otherAccepted.revisionNumber})`,
        };
      }
      updates.acceptedAt = now;
      updates.acceptedBy = session.user.id;
    }

    await db.update(quotations).set(updates).where(eq(quotations.id, id));

    revalidateQuotationPaths(id, existing.surveyId);
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
