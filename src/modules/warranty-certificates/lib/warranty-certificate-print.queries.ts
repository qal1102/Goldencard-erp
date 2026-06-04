import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { warrantyCertificates } from '@/db/schema';

export async function queryWarrantyCertificateForPrint(id: string) {
  return db.query.warrantyCertificates.findFirst({
    where: eq(warrantyCertificates.id, id),
    with: {
      customer: {
        columns: { fullName: true, phone: true, address: true, province: true },
      },
      handover: { columns: { handoverAt: true, customerReceiverName: true } },
      survey: {
        columns: {
          address: true,
          province: true,
          recommendedSystemKw: true,
          panelWattageW: true,
          recommendedPanelQuantity: true,
          inverterType: true,
          inverterQuantity: true,
        },
        with: {
          zones: {
            columns: {
              recommendedSystemKw: true,
              panelWattageW: true,
              recommendedPanelQuantity: true,
              usableAreaM2: true,
              zoneName: true,
            },
          },
        },
      },
      quotation: {
        with: {
          items: {
            columns: { productName: true, quantity: true, sortOrder: true },
            orderBy: (items, { asc }) => [asc(items.sortOrder)],
          },
        },
      },
      workOrder: {
        columns: { installationAddress: true, province: true },
      },
      lead: { columns: { address: true, province: true } },
    },
  });
}

export type WarrantyCertificatePrintSource = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyCertificateForPrint>>
>;
