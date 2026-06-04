import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { warrantyCertificates } from '@/db/schema';
import type { WarrantyCertificateFilters } from '../schema/warranty-certificate.schema';

export async function nextWarrantyCertificateCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('warranty_certificate_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `PBH-${seq.toString().padStart(4, '0')}`;
}

export async function queryWarrantyCertificates(filters: WarrantyCertificateFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(warrantyCertificates.status, filters.status));
  if (filters.customerId) conditions.push(eq(warrantyCertificates.customerId, filters.customerId));
  if (filters.handoverId) conditions.push(eq(warrantyCertificates.handoverId, filters.handoverId));

  return db.query.warrantyCertificates.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true, phone: true } },
      handover: { columns: { id: true, code: true, status: true } },
    },
    orderBy: [desc(warrantyCertificates.createdAt)],
  });
}

export async function queryWarrantyCertificateById(id: string) {
  return db.query.warrantyCertificates.findFirst({
    where: eq(warrantyCertificates.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true, province: true },
      },
      lead: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true, status: true } },
      quotation: { columns: { id: true, code: true, status: true } },
      contract: { columns: { id: true, code: true, status: true } },
      workOrder: { columns: { id: true, code: true, status: true } },
      handover: {
        columns: {
          id: true,
          code: true,
          status: true,
          handoverAt: true,
          customerReceiverName: true,
        },
      },
      createdByUser: { columns: { id: true, name: true } },
    },
  });
}

export async function queryWarrantyCertificateByHandoverId(handoverId: string) {
  return db.query.warrantyCertificates.findFirst({
    where: eq(warrantyCertificates.handoverId, handoverId),
    columns: { id: true, code: true, status: true, publicToken: true },
  });
}

export async function queryWarrantyCertificatesByCustomerId(customerId: string) {
  return db.query.warrantyCertificates.findMany({
    where: eq(warrantyCertificates.customerId, customerId),
    columns: { id: true, code: true, status: true, warrantyStartAt: true, warrantyEndAt: true },
    orderBy: [desc(warrantyCertificates.createdAt)],
  });
}

export type WarrantyCertificateRow = Awaited<ReturnType<typeof queryWarrantyCertificates>>[number];
export type WarrantyCertificateDetail = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyCertificateById>>
>;
