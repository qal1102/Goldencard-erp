import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { warrantyCertificates } from '@/db/schema';

/** Customer-safe fields only — no internal entity codes exposed to public UI. */
export async function queryWarrantyCertificateByPublicToken(publicToken: string) {
  return db.query.warrantyCertificates.findFirst({
    where: eq(warrantyCertificates.publicToken, publicToken),
    columns: {
      id: true,
      code: true,
      publicToken: true,
      status: true,
      warrantyStartAt: true,
      warrantyEndAt: true,
      warrantyTerms: true,
      supportPhone: true,
      customerId: true,
      handoverId: true,
      leadId: true,
      surveyId: true,
      quotationId: true,
      contractId: true,
      workOrderId: true,
      createdBy: true,
    },
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
        columns: { id: true },
        with: {
          items: {
            columns: { productName: true, quantity: true },
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

export type WarrantyCertificatePublicSource = NonNullable<
  Awaited<ReturnType<typeof queryWarrantyCertificateByPublicToken>>
>;
