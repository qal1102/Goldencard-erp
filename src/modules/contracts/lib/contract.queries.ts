import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, contracts, users } from '@/db/schema';
import type { ContractFilters } from '../schema/contract.schema';

export async function nextContractCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('contract_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `HD-${seq.toString().padStart(4, '0')}`;
}

export async function queryContracts(filters: ContractFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(contracts.status, filters.status));
  if (filters.customerId) conditions.push(eq(contracts.customerId, filters.customerId));

  return db.query.contracts.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      quotation: { columns: { id: true, code: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
    orderBy: [desc(contracts.createdAt)],
  });
}

export async function queryContractById(id: string) {
  return db.query.contracts.findFirst({
    where: eq(contracts.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true },
      },
      lead: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true, status: true } },
      quotation: {
        columns: {
          id: true,
          code: true,
          status: true,
          revisionNumber: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          vatRate: true,
          grandTotal: true,
        },
      },
      createdByUser: { columns: { id: true, name: true } },
      signedByUser: { columns: { id: true, name: true } },
    },
  });
}

export async function queryContractByQuotationId(quotationId: string) {
  return db.query.contracts.findFirst({
    where: eq(contracts.quotationId, quotationId),
    columns: { id: true, code: true, status: true },
  });
}

export async function queryContractAuditLogs(contractId: string, limit = 20) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      summary: sql<string | null>`${auditLogs.newData}->>'summary'`,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(eq(auditLogs.resource, 'contract'), eq(auditLogs.resourceId, contractId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export type ContractRow = Awaited<ReturnType<typeof queryContracts>>[number];
export type ContractDetail = NonNullable<Awaited<ReturnType<typeof queryContractById>>>;
