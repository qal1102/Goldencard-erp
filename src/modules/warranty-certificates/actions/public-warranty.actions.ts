'use server';

import { db } from '@/db';
import { warrantyTickets } from '@/db/schema';
import { safeNotify } from '@/lib/notifications/create-notification';
import { notifyWarrantyTicketFromPublicQr } from '@/lib/notifications/events/warranty-certificate-events';
import { nextWarrantyTicketCode } from '@/modules/warranty-tickets/lib/warranty-ticket.queries';
import { resolveSupportPhone } from '../lib/support-phone';
import {
  publicWarrantySupportSchema,
  type PublicWarrantySupportInput,
} from '../schema/warranty-certificate.schema';
import { resolveWarrantyCertificateStatus } from '../lib/warranty-certificate-status';
import { queryWarrantyCertificateByPublicToken } from '../lib/warranty-certificate-public.queries';
import {
  buildCustomerSystemSummary,
  resolveCustomerInstallationAddress,
} from '../lib/build-customer-system-summary';
import { WARRANTY_CERTIFICATE_STATUS_LABELS } from '../schema/warranty-certificate.schema';
import {
  assertPublicQrSubmitAllowed,
  buildQrIssueSourceNote,
} from '../lib/warranty-qr-support';

export type PublicActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type PublicWarrantyCheckView = {
  code: string;
  statusLabel: string;
  customerName: string;
  installationAddress: string;
  systemRows: Array<{ label: string; value: string }>;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  supportPhone: string;
  supportPhoneTel: string | null;
  canSubmitRequest: boolean;
};

function formatPublicDate(date: Date | string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function getPublicWarrantyCheckAction(
  publicToken: string,
): Promise<PublicActionResult<PublicWarrantyCheckView>> {
  try {
    const certificate = await queryWarrantyCertificateByPublicToken(publicToken);
    if (!certificate) {
      return { success: false, error: 'Không tìm thấy thông tin bảo hành' };
    }

    const effectiveStatus = resolveWarrantyCertificateStatus({
      status: certificate.status,
      warrantyEndAt: certificate.warrantyEndAt,
    });

    const installationAddress = resolveCustomerInstallationAddress({
      workOrder: certificate.workOrder,
      survey: certificate.survey,
      lead: certificate.lead,
      customer: certificate.customer,
    });

    const systemRows = buildCustomerSystemSummary(
      certificate.survey,
      certificate.quotation?.items,
    );

    const supportPhone = resolveSupportPhone(certificate.supportPhone);
    const supportDigits = supportPhone.replace(/\D/g, '');
    const supportPhoneTel = supportDigits.length >= 9 ? supportDigits : null;

    return {
      success: true,
      data: {
        code: certificate.code,
        statusLabel: WARRANTY_CERTIFICATE_STATUS_LABELS[effectiveStatus],
        customerName: certificate.customer?.fullName ?? '—',
        installationAddress,
        systemRows,
        warrantyStart: formatPublicDate(certificate.warrantyStartAt),
        warrantyEnd: formatPublicDate(certificate.warrantyEndAt),
        supportPhone,
        supportPhoneTel,
        canSubmitRequest: effectiveStatus === 'active',
      },
    };
  } catch (e) {
    console.error('[getPublicWarrantyCheckAction]', e);
    return { success: false, error: 'Không thể tải thông tin bảo hành' };
  }
}

export async function submitPublicWarrantySupportAction(
  input: PublicWarrantySupportInput,
): Promise<PublicActionResult<{ message: string }>> {
  try {
    const parsed = publicWarrantySupportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
      };
    }

    const data = parsed.data;
    const certificate = await queryWarrantyCertificateByPublicToken(data.publicToken);
    if (!certificate) {
      return { success: false, error: 'Không tìm thấy thông tin bảo hành' };
    }

    const effectiveStatus = resolveWarrantyCertificateStatus({
      status: certificate.status,
      warrantyEndAt: certificate.warrantyEndAt,
    });
    if (effectiveStatus !== 'active') {
      return { success: false, error: 'Phiếu bảo hành không còn hiệu lực' };
    }

    const submitGuard = await assertPublicQrSubmitAllowed(
      certificate.handoverId,
      certificate.code,
    );
    if (!submitGuard.allowed) {
      return { success: false, error: submitGuard.error };
    }

    const qrNote = buildQrIssueSourceNote(certificate.code);
    const descriptionParts = [data.issueDescription?.trim(), qrNote].filter(Boolean);
    const issueDescription = descriptionParts.join('\n\n') || qrNote;

    const code = await nextWarrantyTicketCode();

    const [ticket] = await db
      .insert(warrantyTickets)
      .values({
        code,
        customerId: certificate.customerId,
        leadId: certificate.leadId,
        surveyId: certificate.surveyId,
        quotationId: certificate.quotationId,
        contractId: certificate.contractId,
        workOrderId: certificate.workOrderId,
        handoverId: certificate.handoverId,
        status: 'open',
        priority: 'normal',
        issueTitle: data.issueTitle.trim(),
        issueDescription,
        customerContactName: data.contactName?.trim() || certificate.customer?.fullName || null,
        customerContactPhone:
          data.contactPhone?.trim() || certificate.customer?.phone || null,
        documentLinks: data.documentLinks?.trim() || null,
        createdBy: certificate.createdBy,
      })
      .returning({ id: warrantyTickets.id, code: warrantyTickets.code });

    if (!ticket) {
      return { success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại.' };
    }

    await safeNotify(() =>
      notifyWarrantyTicketFromPublicQr({
        ticketId: ticket.id,
        ticketCode: ticket.code,
        issueTitle: data.issueTitle.trim(),
        customerId: certificate.customerId,
        leadId: certificate.leadId,
      }),
    );

    return {
      success: true,
      data: {
        message:
          'GoldenCard đã nhận yêu cầu hỗ trợ. Nhân viên sẽ liên hệ lại trong thời gian sớm nhất.',
      },
    };
  } catch (e) {
    console.error('[submitPublicWarrantySupportAction]', e);
    return { success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại.' };
  }
}
