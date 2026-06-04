import 'server-only';

import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { warrantyTickets } from '@/db/schema';

export const WARRANTY_QR_SOURCE_MARKER = 'Quét mã QR phiếu bảo hành';

export const PUBLIC_QR_MAX_SUBMISSIONS_PER_WINDOW = 3;
export const PUBLIC_QR_RATE_LIMIT_WINDOW_MINUTES = 30;

export function buildQrIssueSourceNote(certificateCode: string): string {
  return `[Nguồn: ${WARRANTY_QR_SOURCE_MARKER} ${certificateCode}]`;
}

function qrSourceCondition(handoverId: string, certificateCode: string) {
  return and(
    eq(warrantyTickets.handoverId, handoverId),
    sql`${warrantyTickets.issueDescription} LIKE ${`%${WARRANTY_QR_SOURCE_MARKER} ${certificateCode}%`}`,
  );
}

export type WarrantyCertificateQrStats = {
  totalFromQr: number;
  openFromQr: number;
  lastSubmittedAt: Date | null;
};

export async function queryWarrantyCertificateQrStats(
  handoverId: string,
  certificateCode: string,
): Promise<WarrantyCertificateQrStats> {
  const where = qrSourceCondition(handoverId, certificateCode);

  const [totalRow, openRow, lastRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(warrantyTickets)
      .where(where),
    db
      .select({ value: count() })
      .from(warrantyTickets)
      .where(and(where, eq(warrantyTickets.status, 'open'))),
    db
      .select({ reportedAt: warrantyTickets.reportedAt })
      .from(warrantyTickets)
      .where(where)
      .orderBy(desc(warrantyTickets.reportedAt))
      .limit(1),
  ]);

  return {
    totalFromQr: Number(totalRow[0]?.value ?? 0),
    openFromQr: Number(openRow[0]?.value ?? 0),
    lastSubmittedAt: lastRow[0]?.reportedAt ?? null,
  };
}

export type PublicQrSubmitGuardResult =
  | { allowed: true }
  | { allowed: false; error: string };

export async function assertPublicQrSubmitAllowed(
  handoverId: string,
  certificateCode: string,
): Promise<PublicQrSubmitGuardResult> {
  const where = qrSourceCondition(handoverId, certificateCode);
  const windowStart = new Date(
    Date.now() - PUBLIC_QR_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  );

  const [recentRow, openRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(warrantyTickets)
      .where(and(where, gte(warrantyTickets.reportedAt, windowStart))),
    db
      .select({ value: count() })
      .from(warrantyTickets)
      .where(and(where, eq(warrantyTickets.status, 'open'))),
  ]);

  const recentCount = Number(recentRow[0]?.value ?? 0);
  if (recentCount >= PUBLIC_QR_MAX_SUBMISSIONS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Một mã QR chỉ được gửi tối đa ${PUBLIC_QR_MAX_SUBMISSIONS_PER_WINDOW} yêu cầu trong ${PUBLIC_QR_RATE_LIMIT_WINDOW_MINUTES} phút. Vui lòng gọi hotline nếu cần hỗ trợ gấp.`,
    };
  }

  const openCount = Number(openRow[0]?.value ?? 0);
  if (openCount > 0 && recentCount > 0) {
    return {
      allowed: false,
      error:
        'Bạn đã có yêu cầu đang được xử lý. Vui lòng gọi hotline hoặc chờ phản hồi từ GoldenCard trước khi gửi thêm.',
    };
  }

  return { allowed: true };
}
