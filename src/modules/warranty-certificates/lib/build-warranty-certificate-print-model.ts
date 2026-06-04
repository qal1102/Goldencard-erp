import 'server-only';

import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import { resolveSupportPhone } from './support-phone';
import { formatDocumentDate } from '@/lib/documents/format-document-value';
import { getPublicWarrantyCheckUrl } from './public-url';
import { resolveWarrantyCertificateStatus } from './warranty-certificate-status';
import {
  buildCustomerSystemSummary,
  resolveCustomerInstallationAddress,
} from './build-customer-system-summary';
import { WARRANTY_CERTIFICATE_STATUS_LABELS } from '../schema/warranty-certificate.schema';
import type { WarrantyCertificatePrintSource } from './warranty-certificate-print.queries';

export type WarrantyCertificatePrintModel = {
  code: string;
  statusLabel: string;
  printedAt: string;
  company: typeof GOLDENCARD_COMPANY_PROFILE;
  customer: {
    name: string;
    phone: string;
    installationAddress: string;
  };
  systemRows: Array<{ label: string; value: string }>;
  warrantyStart: string;
  warrantyEnd: string;
  warrantyTerms: string;
  supportPhone: string;
  publicCheckUrl: string;
  note: string | null;
};

export function buildWarrantyCertificatePrintModel(
  source: WarrantyCertificatePrintSource,
): WarrantyCertificatePrintModel {
  const effectiveStatus = resolveWarrantyCertificateStatus({
    status: source.status,
    warrantyEndAt: source.warrantyEndAt,
  });

  const installationAddress = resolveCustomerInstallationAddress({
    workOrder: source.workOrder,
    survey: source.survey,
    lead: source.lead,
    customer: source.customer,
  });

  const systemRows = buildCustomerSystemSummary(
    source.survey,
    source.quotation?.items,
  );

  return {
    code: source.code,
    statusLabel: WARRANTY_CERTIFICATE_STATUS_LABELS[effectiveStatus],
    printedAt: formatDocumentDate(new Date()),
    company: GOLDENCARD_COMPANY_PROFILE,
    customer: {
      name: source.customer?.fullName ?? '—',
      phone: source.customer?.phone ?? '—',
      installationAddress,
    },
    systemRows,
    warrantyStart: source.warrantyStartAt
      ? formatDocumentDate(source.warrantyStartAt)
      : '—',
    warrantyEnd: source.warrantyEndAt ? formatDocumentDate(source.warrantyEndAt) : '—',
    warrantyTerms: source.warrantyTerms?.trim() || '—',
    supportPhone: resolveSupportPhone(source.supportPhone),
    publicCheckUrl: getPublicWarrantyCheckUrl(source.publicToken),
    note: source.note?.trim() || null,
  };
}
