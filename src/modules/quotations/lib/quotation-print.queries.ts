import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { quotations } from '@/db/schema';

export async function queryQuotationForPrint(id: string) {
  return db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    columns: {
      id: true,
      code: true,
      revisionNumber: true,
      validUntil: true,
      note: true,
      createdAt: true,
      customerNameSnapshot: true,
      customerPhoneSnapshot: true,
      customerAddressSnapshot: true,
      subtotal: true,
      discountAmount: true,
      taxAmount: true,
      vatRate: true,
      grandTotal: true,
    },
    with: {
      survey: {
        columns: {
          address: true,
          province: true,
          panelWattageW: true,
        },
      },
      items: {
        columns: {
          sortOrder: true,
          inventoryItemId: true,
          productName: true,
          description: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          lineTotal: true,
        },
        with: {
          inventoryItem: {
            columns: {
              sku: true,
              name: true,
              category: true,
              specification: true,
              imageUrl: true,
            },
          },
        },
        orderBy: (items, { asc }) => [asc(items.sortOrder)],
      },
    },
  });
}

export type QuotationPrintSource = NonNullable<Awaited<ReturnType<typeof queryQuotationForPrint>>>;
