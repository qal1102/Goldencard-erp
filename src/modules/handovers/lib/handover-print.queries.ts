import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { handovers } from '@/db/schema';

export async function queryHandoverForPrint(id: string) {
  return db.query.handovers.findFirst({
    where: eq(handovers.id, id),
    with: {
      customer: {
        columns: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          address: true,
          province: true,
        },
      },
      lead: {
        columns: {
          id: true,
          code: true,
          fullName: true,
          address: true,
          province: true,
        },
      },
      survey: {
        columns: {
          id: true,
          code: true,
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
              cableRouteDistanceM: true,
              installationDifficulty: true,
              needsRoofReinforcement: true,
              zoneName: true,
            },
          },
        },
      },
      quotation: {
        columns: { id: true, code: true },
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
      contract: { columns: { id: true, code: true } },
      workOrder: {
        columns: {
          id: true,
          code: true,
          installationAddress: true,
          province: true,
          completedAt: true,
        },
        with: {
          assignedUser: { columns: { name: true } },
          completedByUser: { columns: { name: true } },
        },
      },
      handedOverByUser: { columns: { name: true } },
    },
  });
}

export type HandoverPrintSource = NonNullable<Awaited<ReturnType<typeof queryHandoverForPrint>>>;
