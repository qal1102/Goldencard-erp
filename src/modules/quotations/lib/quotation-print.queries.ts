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
      status: true,
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
          photosNote: true,
          recommendedSystemKw: true,
          panelWattageW: true,
          recommendedPanelQuantity: true,
          inverterType: true,
          inverterQuantity: true,
          systemType: true,
          powerPhase: true,
          projectType: true,
          projectScale: true,
        },
        with: {
          zones: {
            columns: {
              zoneName: true,
              recommendedSystemKw: true,
              panelWattageW: true,
              recommendedPanelQuantity: true,
              usableAreaM2: true,
              cableRouteDistanceM: true,
              installationDifficulty: true,
              needsRoofReinforcement: true,
            },
          },
          lead: {
            columns: {
              consultationNote: true,
              customerRequirements: true,
            },
          },
        },
      },
      items: {
        columns: {
          sortOrder: true,
          productName: true,
          description: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          lineTotal: true,
        },
        orderBy: (items, { asc }) => [asc(items.sortOrder)],
      },
    },
  });
}

export type QuotationPrintSource = NonNullable<Awaited<ReturnType<typeof queryQuotationForPrint>>>;
