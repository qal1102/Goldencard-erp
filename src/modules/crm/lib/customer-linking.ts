import 'server-only';

import { desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { db } from '@/db';
import type * as schema from '@/db/schema';
import { customers, leads } from '@/db/schema';
import {
  normalizePhoneForComparison,
  normalizePhoneForStorage,
  phoneLookupVariants,
} from '@/lib/phone/normalize-phone';
import type { CreateLeadInput } from '../schema/lead.schema';

type Db = PostgresJsDatabase<typeof schema>;

export type CustomerLinkResult = {
  customerId: string;
  customerCode: string;
  linkedExisting: boolean;
  autoCreated: boolean;
};

const toNull = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

async function nextCustomerCode(tx: Db): Promise<string> {
  const codeResult = await tx.execute(sql`SELECT nextval('customer_code_seq') AS seq`);
  const seq = Number((codeResult as unknown as Array<{ seq: string }>)[0].seq);
  return `KH${seq.toString().padStart(4, '0')}`;
}

export type ExistingCustomerMatch = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
};

async function findCustomerByPhone(tx: Db, phone: string): Promise<ExistingCustomerMatch | null> {
  const variants = phoneLookupVariants(phone);
  const byExact = await tx.query.customers.findFirst({
    where: or(...variants.map((v) => eq(customers.phone, v))),
  });
  if (byExact) return byExact;

  const normalized = normalizePhoneForComparison(phone);
  const candidates = await tx.select().from(customers);
  return (
    candidates.find((c) => normalizePhoneForComparison(c.phone) === normalized) ?? null
  );
}

async function findLeadWithCustomerByPhone(tx: Db, phone: string) {
  const variants = phoneLookupVariants(phone);
  const byExact = await tx.query.leads.findMany({
    where: or(...variants.map((v) => eq(leads.phone, v))),
    columns: { id: true, customerId: true, phone: true },
    orderBy: [desc(leads.createdAt)],
  });

  const withCustomer = byExact.find((l) => l.customerId);
  if (withCustomer?.customerId) {
    const customer = await tx.query.customers.findFirst({
      where: eq(customers.id, withCustomer.customerId),
    });
    if (customer) return customer;
  }

  const normalized = normalizePhoneForComparison(phone);
  for (const lead of byExact) {
    if (!lead.customerId) continue;
    const customer = await tx.query.customers.findFirst({
      where: eq(customers.id, lead.customerId),
    });
    if (customer && normalizePhoneForComparison(customer.phone) === normalized) {
      return customer;
    }
  }

  return null;
}

async function countLeadsByPhone(tx: Db, phone: string): Promise<number> {
  const variants = phoneLookupVariants(phone);
  const normalized = normalizePhoneForComparison(phone);

  const byExact = await tx.query.leads.findMany({
    where: or(...variants.map((v) => eq(leads.phone, v))),
    columns: { id: true, phone: true },
  });

  const matched = byExact.filter((l) => normalizePhoneForComparison(l.phone) === normalized);
  if (matched.length > 0) return matched.length;

  const allLeads = await tx.select({ id: leads.id, phone: leads.phone }).from(leads);
  return allLeads.filter((l) => normalizePhoneForComparison(l.phone) === normalized).length;
}

/** Look up an existing customer by phone (read-only, for form preview). */
export async function lookupCustomerByPhone(
  phone: string,
): Promise<ExistingCustomerMatch | null> {
  const normalized = normalizePhoneForStorage(phone);
  return db.transaction(async (tx) => findCustomerByPhone(tx, normalized));
}

/** Count leads sharing the same normalized phone. */
export async function lookupLeadCountByPhone(phone: string): Promise<number> {
  const normalized = normalizePhoneForStorage(phone);
  return db.transaction(async (tx) => countLeadsByPhone(tx, normalized));
}

async function createCustomerFromLeadData(
  tx: Db,
  data: CreateLeadInput,
  createdByUserId: string | null,
): Promise<{ id: string; code: string }> {
  const customerCode = await nextCustomerCode(tx);
  const [customer] = await tx
    .insert(customers)
    .values({
      code: customerCode,
      fullName: data.fullName,
      phone: normalizePhoneForStorage(data.phone),
      email: toNull(data.email),
      address: data.address,
      province: toNull(data.province),
      notes: toNull(data.notes),
      referrerName: toNull(data.referrerName),
      referrerPhone: toNull(data.referrerPhone),
      referralNote: toNull(data.referralNote),
      convertedBy: createdByUserId,
    })
    .returning({ id: customers.id, code: customers.code });

  if (!customer) throw new Error('Không thể tạo hồ sơ khách hàng');
  return customer;
}

/** Resolve or create the master customer record for a new lead. */
export async function resolveCustomerForNewLead(
  tx: Db,
  data: CreateLeadInput,
  createdByUserId: string,
): Promise<CustomerLinkResult> {
  const phone = normalizePhoneForStorage(data.phone);
  let customer = await findCustomerByPhone(tx, phone);

  if (!customer) {
    customer = await findLeadWithCustomerByPhone(tx, phone);
  }

  if (customer) {
    return {
      customerId: customer.id,
      customerCode: customer.code,
      linkedExisting: true,
      autoCreated: false,
    };
  }

  const created = await createCustomerFromLeadData(tx, data, createdByUserId);
  return {
    customerId: created.id,
    customerCode: created.code,
    linkedExisting: false,
    autoCreated: true,
  };
}

/** Backfill customer_id on orphan leads sharing the same phone when a customer exists. */
export async function linkOrphanLeadsToCustomer(
  tx: Db,
  customerId: string,
  phone: string,
): Promise<void> {
  const variants = phoneLookupVariants(phone);
  const normalized = normalizePhoneForComparison(phone);

  const orphanLeads = await tx.query.leads.findMany({
    where: or(...variants.map((v) => eq(leads.phone, v))),
    columns: { id: true, customerId: true, phone: true },
  });

  const idsToLink = orphanLeads
    .filter(
      (l) =>
        !l.customerId && normalizePhoneForComparison(l.phone) === normalized,
    )
    .map((l) => l.id);

  if (idsToLink.length === 0) return;

  await tx
    .update(leads)
    .set({ customerId, updatedAt: new Date() })
    .where(inArray(leads.id, idsToLink));
}
