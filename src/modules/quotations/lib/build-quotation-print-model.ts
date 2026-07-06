import 'server-only';

import { buildFullAddress } from '@/lib/address/format-address';
import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import {
  formatDocumentDate,
  formatDocumentValue,
} from '@/lib/documents/format-document-value';
import {
  QUOTATION_PRINT_GENERIC_TERMS,
  QUOTATION_PRINT_PAYMENT_TERMS,
  QUOTATION_PRINT_WARRANTY_TEXT,
} from './quotation-export';
import { getQuotationItemTemplates } from './quotation-item-templates';
import type { QuotationPrintSource } from './quotation-print.queries';

export type QuotationPrintLineItem = {
  index: number;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export type QuotationPrintMainEquipment = {
  name: string;
  sku: string;
  category: string;
  specification: string | null;
  imageUrl: string;
};

export type QuotationPrintTermsSection = {
  title: string;
  body: string;
};

export type QuotationPrintModel = {
  /** Internal trace — footer only, not prominent in header. */
  footerTrace: string | null;
  quotationDate: string;
  company: typeof GOLDENCARD_COMPANY_PROFILE;
  customer: {
    name: string;
    phone: string;
    installationAddress: string;
    contactPerson: string | null;
  };
  items: QuotationPrintLineItem[];
  mainEquipment: QuotationPrintMainEquipment[];
  itemsFallback: boolean;
  totals: {
    subtotal: string;
    discount: string | null;
    tax: string | null;
    vatRateLabel: string | null;
    grandTotal: string;
  };
  termsSections: QuotationPrintTermsSection[];
  signatures: {
    goldenCardTitle: string;
    customerTitle: string;
  };
};

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function parseQuantity(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQuantity(value: string): string {
  const n = parseQuantity(value);
  if (n <= 0) return '';
  return Number.isInteger(n) ? String(n) : n.toLocaleString('vi-VN');
}

function resolvePanelWattage(source: QuotationPrintSource): number {
  return source.survey?.panelWattageW ?? 550;
}

/** Map internal template keys to customer-facing Vietnamese labels. */
function sanitizeCustomerFacingText(
  value: string,
  panelWattageW: number,
  field: 'name' | 'description',
): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const templates = getQuotationItemTemplates(panelWattageW);
  const key = trimmed.toLowerCase();
  const byId = templates.find((t) => t.id === key);
  if (byId) {
    return field === 'name' ? byId.productName : byId.description;
  }

  return trimmed;
}

function resolveInstallationAddress(source: QuotationPrintSource): string {
  const snapshot = source.customerAddressSnapshot?.trim();
  if (snapshot) return snapshot;

  const survey = source.survey;
  if (survey) {
    const fromSurvey = buildFullAddress(survey.address, survey.province);
    if (fromSurvey) return fromSurvey;
  }

  return '';
}

function buildLineItems(source: QuotationPrintSource): QuotationPrintLineItem[] {
  const panelWattageW = resolvePanelWattage(source);

  return (source.items ?? []).map((item, index) => ({
    index: index + 1,
    name: sanitizeCustomerFacingText(item.productName, panelWattageW, 'name'),
    description: sanitizeCustomerFacingText(
      item.description ?? '',
      panelWattageW,
      'description',
    ),
    unit: item.unit,
    quantity: formatQuantity(item.quantity) || '—',
    unitPrice: formatCurrency(item.unitPrice),
    lineTotal: formatCurrency(item.lineTotal),
  }));
}

function isMainEquipmentCategory(category?: string | null) {
  return ['Tấm pin', 'Inverter', 'Tủ điện', 'Thiết bị bảo vệ'].includes(category ?? '');
}

function buildMainEquipment(source: QuotationPrintSource): QuotationPrintMainEquipment[] {
  const bySku = new Map<string, QuotationPrintMainEquipment>();

  for (const item of source.items ?? []) {
    const inventoryItem = item.inventoryItem;
    if (!inventoryItem?.imageUrl || !isMainEquipmentCategory(inventoryItem.category)) {
      continue;
    }

    bySku.set(inventoryItem.sku, {
      name: inventoryItem.name,
      sku: inventoryItem.sku,
      category: inventoryItem.category ?? 'Thiết bị chính',
      specification: inventoryItem.specification,
      imageUrl: inventoryItem.imageUrl,
    });
  }

  return Array.from(bySku.values()).slice(0, 4);
}

function buildTermsSections(source: QuotationPrintSource): QuotationPrintTermsSection[] {
  const validityBody = source.validUntil
    ? `Báo giá có hiệu lực đến ngày ${formatDocumentDate(source.validUntil)}.`
    : QUOTATION_PRINT_GENERIC_TERMS;

  const note = source.note?.trim();

  const sections: QuotationPrintTermsSection[] = [
    { title: 'Hiệu lực báo giá', body: validityBody },
    { title: 'Điều kiện thanh toán', body: QUOTATION_PRINT_PAYMENT_TERMS },
    {
      title: 'Thời gian thi công dự kiến',
      body: QUOTATION_PRINT_GENERIC_TERMS,
    },
    {
      title: 'Bảo hành / hỗ trợ sau lắp đặt',
      body: QUOTATION_PRINT_WARRANTY_TEXT,
    },
    {
      title: 'Ghi chú khác',
      body: note || QUOTATION_PRINT_GENERIC_TERMS,
    },
  ];

  return sections;
}

function buildFooterTrace(source: QuotationPrintSource): string | null {
  const revisionNumber = source.revisionNumber ?? 1;
  const code = source.code?.trim();
  if (!code) return null;
  if (revisionNumber > 1) {
    return `${code} · bản ${revisionNumber}`;
  }
  return code;
}

export function buildQuotationPrintModel(source: QuotationPrintSource): QuotationPrintModel {
  const discount = parseFloat(source.discountAmount ?? '0');
  const tax = parseFloat(source.taxAmount ?? '0');
  const vatRate = source.vatRate ? parseFloat(source.vatRate) : null;
  const items = buildLineItems(source);
  const mainEquipment = buildMainEquipment(source);

  return {
    footerTrace: buildFooterTrace(source),
    quotationDate: formatDocumentDate(source.createdAt),
    company: GOLDENCARD_COMPANY_PROFILE,
    customer: {
      name: formatDocumentValue(source.customerNameSnapshot),
      phone: formatDocumentValue(source.customerPhoneSnapshot),
      installationAddress: formatDocumentValue(resolveInstallationAddress(source)),
      contactPerson: null,
    },
    items,
    mainEquipment,
    itemsFallback: items.length === 0,
    totals: {
      subtotal: formatCurrency(source.subtotal),
      discount: discount > 0 ? formatCurrency(source.discountAmount) : null,
      tax: tax > 0 ? formatCurrency(source.taxAmount) : null,
      vatRateLabel:
        vatRate != null && !isNaN(vatRate) && tax > 0 ? `${vatRate}%` : null,
      grandTotal: formatCurrency(source.grandTotal),
    },
    termsSections: buildTermsSections(source),
    signatures: {
      goldenCardTitle: 'ĐẠI DIỆN GOLDENCARD',
      customerTitle: 'KHÁCH HÀNG',
    },
  };
}
