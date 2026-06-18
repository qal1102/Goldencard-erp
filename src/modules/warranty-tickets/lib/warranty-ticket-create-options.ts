import 'server-only';

import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { customers } from '@/db/schema';

export type WarrantyCertificateOption = {
  id: string;
  code: string;
  status: string;
  warrantyStartAt: string | null;
  warrantyEndAt: string | null;
  leadId: string | null;
  surveyId: string | null;
  quotationId: string | null;
  contractId: string | null;
  workOrderId: string | null;
  handoverId: string | null;
  handover: {
    id: string;
    code: string;
    handoverAt: string | null;
  } | null;
};

export type WarrantyCustomerOption = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  address: string;
  province: string | null;
  warrantyCertificates: WarrantyCertificateOption[];
};

export async function queryWarrantyCustomerOptions(): Promise<WarrantyCustomerOption[]> {
  const rows = await db.query.customers.findMany({
    columns: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      address: true,
      province: true,
    },
    with: {
      warrantyCertificates: {
        columns: {
          id: true,
          code: true,
          status: true,
          warrantyStartAt: true,
          warrantyEndAt: true,
          leadId: true,
          surveyId: true,
          quotationId: true,
          contractId: true,
          workOrderId: true,
          handoverId: true,
        },
        with: {
          handover: {
            columns: {
              id: true,
              code: true,
              handoverAt: true,
            },
          },
        },
        orderBy: (certificates, { desc: orderDesc }) => [
          orderDesc(certificates.createdAt),
        ],
        limit: 10,
      },
    },
    orderBy: [desc(customers.createdAt)],
    limit: 200,
  });

  return rows.map((customer) => ({
    ...customer,
    warrantyCertificates: customer.warrantyCertificates.map((certificate) => ({
      ...certificate,
      warrantyStartAt: certificate.warrantyStartAt?.toISOString() ?? null,
      warrantyEndAt: certificate.warrantyEndAt?.toISOString() ?? null,
      handover: certificate.handover
        ? {
            ...certificate.handover,
            handoverAt: certificate.handover.handoverAt?.toISOString() ?? null,
          }
        : null,
    })),
  }));
}
