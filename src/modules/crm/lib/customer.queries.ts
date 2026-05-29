import 'server-only';

import { and, desc, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { customers } from '@/db/schema';
import type { CustomerFilters } from '../schema/customer.schema';

export async function queryCustomers(filters: CustomerFilters = {}) {
  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(customers.fullName, term), ilike(customers.phone, term)));
  }

  return db.query.customers.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      lead: { columns: { id: true, code: true } },
    },
    orderBy: [desc(customers.createdAt)],
  });
}
