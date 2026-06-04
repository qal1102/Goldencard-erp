import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { handovers } from '@/db/schema';
import type { HandoverFilters } from '../schema/handover.schema';

export async function nextHandoverCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('handover_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `BB-${seq.toString().padStart(4, '0')}`;
}

export async function queryHandovers(filters: HandoverFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(handovers.status, filters.status));
  if (filters.customerId) conditions.push(eq(handovers.customerId, filters.customerId));

  return db.query.handovers.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      workOrder: { columns: { id: true, code: true } },
    },
    orderBy: [desc(handovers.createdAt)],
    limit: 200,
  });
}

export async function queryHandoverById(id: string) {
  return db.query.handovers.findFirst({
    where: eq(handovers.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true },
      },
      lead: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true, status: true } },
      quotation: { columns: { id: true, code: true, status: true } },
      contract: { columns: { id: true, code: true, status: true } },
      workOrder: { columns: { id: true, code: true, status: true } },
      handedOverByUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
    },
  });
}

export async function queryHandoverByWorkOrderId(workOrderId: string) {
  return db.query.handovers.findFirst({
    where: eq(handovers.workOrderId, workOrderId),
    columns: { id: true, code: true, status: true },
  });
}

export type HandoverRow = Awaited<ReturnType<typeof queryHandovers>>[number];
export type HandoverDetail = NonNullable<Awaited<ReturnType<typeof queryHandoverById>>>;
