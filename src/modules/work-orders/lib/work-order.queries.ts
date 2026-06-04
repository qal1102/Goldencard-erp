import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders } from '@/db/schema';
import type { WorkOrderFilters } from '../schema/work-order.schema';

export async function nextWorkOrderCode(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('work_order_code_seq') AS seq`);
  const seq = Number((result as unknown as Array<{ seq: string }>)[0].seq);
  return `LTC-${seq.toString().padStart(4, '0')}`;
}

export async function queryWorkOrders(filters: WorkOrderFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(workOrders.status, filters.status));
  if (filters.customerId) conditions.push(eq(workOrders.customerId, filters.customerId));
  if (filters.assignedTo) conditions.push(eq(workOrders.assignedTo, filters.assignedTo));

  return db.query.workOrders.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, code: true, fullName: true } },
      contract: { columns: { id: true, code: true } },
      assignedUser: { columns: { id: true, name: true } },
    },
    orderBy: [desc(workOrders.createdAt)],
    limit: 200,
  });
}

export async function queryWorkOrderById(id: string) {
  return db.query.workOrders.findFirst({
    where: eq(workOrders.id, id),
    with: {
      customer: {
        columns: { id: true, code: true, fullName: true, phone: true, address: true },
      },
      lead: { columns: { id: true, code: true, fullName: true } },
      survey: { columns: { id: true, code: true, status: true } },
      quotation: { columns: { id: true, code: true, status: true } },
      contract: { columns: { id: true, code: true, status: true } },
      assignedUser: { columns: { id: true, name: true } },
      createdByUser: { columns: { id: true, name: true } },
      completedByUser: { columns: { id: true, name: true } },
      handover: { columns: { id: true, code: true, status: true } },
    },
  });
}

export async function queryWorkOrderByContractId(contractId: string) {
  return db.query.workOrders.findFirst({
    where: eq(workOrders.contractId, contractId),
    columns: { id: true, code: true, status: true },
  });
}

export type WorkOrderRow = Awaited<ReturnType<typeof queryWorkOrders>>[number];
export type WorkOrderDetail = NonNullable<Awaited<ReturnType<typeof queryWorkOrderById>>>;
