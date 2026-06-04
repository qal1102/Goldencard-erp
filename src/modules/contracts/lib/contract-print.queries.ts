import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { contracts } from '@/db/schema';

export async function queryContractForPrint(id: string) {
  return db.query.contracts.findFirst({
    where: eq(contracts.id, id),
    columns: {
      id: true,
      code: true,
      status: true,
      contractValue: true,
      signedAt: true,
      signedDocumentUrl: true,
      customerSignerName: true,
      goldenCardSignerName: true,
      note: true,
      createdAt: true,
    },
    with: {
      customer: {
        columns: {
          fullName: true,
          phone: true,
          address: true,
          province: true,
        },
      },
      lead: {
        columns: {
          fullName: true,
          address: true,
          province: true,
        },
      },
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
              zoneName: true,
              usableAreaM2: true,
              cableRouteDistanceM: true,
              installationDifficulty: true,
              needsRoofReinforcement: true,
            },
          },
        },
      },
      quotation: {
        columns: {
          code: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          vatRate: true,
          grandTotal: true,
        },
        with: {
          items: {
            columns: {
              sortOrder: true,
              productName: true,
              description: true,
              quantity: true,
              unit: true,
            },
            orderBy: (items, { asc }) => [asc(items.sortOrder)],
          },
        },
      },
    },
  });
}

export type ContractPrintSource = NonNullable<Awaited<ReturnType<typeof queryContractForPrint>>>;
