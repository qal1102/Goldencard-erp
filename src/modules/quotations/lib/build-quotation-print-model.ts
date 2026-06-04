import 'server-only';

import { buildFullAddress } from '@/lib/address/format-address';
import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import {
  formatDocumentDate,
  formatDocumentDateTime,
  formatDocumentValue,
} from '@/lib/documents/format-document-value';
import {
  PROJECT_SCALE_LABELS,
  PROJECT_TYPE_LABELS,
  SYSTEM_TYPE_LABELS,
} from '@/modules/surveys/schema/survey.schema';
import { computeSurveyAggregates } from '@/modules/surveys/lib/survey-aggregates';
import { formatZoneBreakdownText } from './generate-quotation-items';
import {
  QUOTATION_PRINT_TERMS_LINES,
  QUOTATION_PRINT_WARRANTY_TEXT,
} from './quotation-export';
import {
  QUOTATION_STATUS_LABELS,
  type QuotationStatus,
} from '../schema/quotation.schema';
import type { QuotationPrintSource } from './quotation-print.queries';

const TECHNICAL_FALLBACK = 'Theo phương án đã khảo sát/thống nhất';

export type QuotationPrintTechnicalRow = {
  label: string;
  value: string;
};

export type QuotationPrintLineItem = {
  index: number;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

export type QuotationPrintModel = {
  code: string;
  codeWithRevision: string;
  statusLabel: string;
  documentDate: string;
  validUntil: string | null;
  printedAt: string;
  company: typeof GOLDENCARD_COMPANY_PROFILE;
  customer: {
    name: string;
    phone: string;
    installationAddress: string;
    contactNote: string | null;
  };
  technicalRows: QuotationPrintTechnicalRow[];
  zoneSummary: string | null;
  items: QuotationPrintLineItem[];
  itemsFallback: boolean;
  totals: {
    subtotal: string;
    discount: string | null;
    tax: string | null;
    vatRateLabel: string | null;
    grandTotal: string;
    showBreakdown: boolean;
  };
  warrantyText: string;
  termsLines: string[];
  quotationNote: string | null;
};

type QuotationItemSource = QuotationPrintSource['items'][number];

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

function labelLookup<T extends string>(
  labels: Record<T, string>,
  key: string | null | undefined,
): string | null {
  if (!key) return null;
  return labels[key as T] ?? key;
}

function inferFromQuotationItems(items: QuotationItemSource[]) {
  let panelCount = '';
  let panelWattage = '';
  let inverter = '';

  for (const item of items) {
    const nameLower = item.productName.toLowerCase();
    if (nameLower.includes('tấm pin') || nameLower.includes('tam pin')) {
      const qty = formatQuantity(item.quantity);
      if (qty) panelCount = `${qty} tấm`;
      const wattMatch = item.productName.match(/(\d+)\s*W/i);
      if (wattMatch) panelWattage = `${wattMatch[1]} W/tấm`;
    }
    if (
      nameLower.includes('inverter') ||
      nameLower.includes('biến tần') ||
      nameLower.includes('bien tan')
    ) {
      const qty = formatQuantity(item.quantity);
      const qtySuffix = qty ? ` · ${qty} bộ` : '';
      inverter = `${item.productName}${qtySuffix}`;
    }
  }

  return { panelCount, panelWattage, inverter };
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

function resolveContactNote(source: QuotationPrintSource): string | null {
  const parts: string[] = [];
  const requirements = source.survey?.lead?.customerRequirements?.trim();
  const consultation = source.survey?.lead?.consultationNote?.trim();
  const photosNote = source.survey?.photosNote?.trim();

  if (requirements) parts.push(requirements);
  if (consultation) parts.push(consultation);
  if (photosNote) parts.push(photosNote);

  return parts.length > 0 ? parts.join('\n') : null;
}

function withFallback(value: string, useFallback: boolean): string {
  return value || (useFallback ? TECHNICAL_FALLBACK : '');
}

function buildTechnicalRows(source: QuotationPrintSource): QuotationPrintTechnicalRow[] {
  const survey = source.survey;
  const items = source.items ?? [];
  const fromQuotation = inferFromQuotationItems(items);

  let systemKw = '';
  let panelCount = '';
  let panelWattage = '';
  let inverter = '';

  if (survey) {
    const zones =
      survey.zones.length > 0
        ? survey.zones
        : [
            {
              zoneName: 'Mái chính',
              recommendedSystemKw: survey.recommendedSystemKw,
              panelWattageW: survey.panelWattageW ?? 550,
              recommendedPanelQuantity: survey.recommendedPanelQuantity,
              usableAreaM2: null,
              cableRouteDistanceM: null,
              installationDifficulty: null,
              needsRoofReinforcement: false,
            },
          ];
    const aggregates = computeSurveyAggregates(zones);

    if (aggregates.totalRecommendedSystemKw > 0) {
      systemKw = `${aggregates.totalRecommendedSystemKw} kWp`;
    } else if (survey.recommendedSystemKw) {
      systemKw = `${survey.recommendedSystemKw} kWp`;
    }

    if (aggregates.totalPanelQuantity > 0) {
      panelCount = `${aggregates.totalPanelQuantity} tấm`;
    } else if (survey.recommendedPanelQuantity != null) {
      panelCount = `${survey.recommendedPanelQuantity} tấm`;
    }

    const firstZone = zones[0];
    const wattage = firstZone?.panelWattageW ?? survey.panelWattageW;
    if (wattage) panelWattage = `${wattage} W/tấm`;

    const inverterParts: string[] = [];
    if (survey.inverterType) inverterParts.push(survey.inverterType);
    if (survey.inverterQuantity != null && survey.inverterQuantity > 0) {
      inverterParts.push(`${survey.inverterQuantity} bộ`);
    }
    if (inverterParts.length > 0) inverter = inverterParts.join(' · ');
  }

  if (!panelCount && fromQuotation.panelCount) panelCount = fromQuotation.panelCount;
  if (!panelWattage && fromQuotation.panelWattage) panelWattage = fromQuotation.panelWattage;
  if (!inverter && fromQuotation.inverter) inverter = fromQuotation.inverter;

  const rows: QuotationPrintTechnicalRow[] = [
    { label: 'Loại hệ thống', value: 'Hệ thống điện mặt trời' },
  ];

  const optionalRows: Array<{ label: string; value: string }> = [
    { label: 'Công suất hệ thống', value: withFallback(systemKw, true) },
    { label: 'Số lượng tấm pin', value: withFallback(panelCount, true) },
    { label: 'Công suất tấm pin', value: withFallback(panelWattage, true) },
    { label: 'Inverter / số lượng', value: withFallback(inverter, true) },
  ];

  for (const row of optionalRows) {
    if (row.value) rows.push(row);
  }

  if (survey) {
    const systemType = labelLookup(SYSTEM_TYPE_LABELS, survey.systemType);
    if (systemType) {
      rows.push({ label: 'Kiểu hệ thống', value: systemType });
    }

    const projectType = labelLookup(PROJECT_TYPE_LABELS, survey.projectType);
    if (projectType) {
      rows.push({ label: 'Loại công trình', value: projectType });
    }

    const projectScale = labelLookup(PROJECT_SCALE_LABELS, survey.projectScale);
    if (projectScale) {
      rows.push({ label: 'Quy mô dự án', value: projectScale });
    }
  }

  return rows;
}

function buildZoneSummary(source: QuotationPrintSource): string | null {
  const survey = source.survey;
  if (!survey || survey.zones.length < 2) return null;

  const aggregates = computeSurveyAggregates(survey.zones);
  return formatZoneBreakdownText(survey.zones, aggregates);
}

function buildLineItems(source: QuotationPrintSource): QuotationPrintLineItem[] {
  return (source.items ?? []).map((item, index) => ({
    index: index + 1,
    name: item.productName,
    description: item.description?.trim() ?? '',
    unit: item.unit,
    quantity: formatQuantity(item.quantity) || '—',
    unitPrice: formatCurrency(item.unitPrice),
    lineTotal: formatCurrency(item.lineTotal),
  }));
}

export function buildQuotationPrintModel(source: QuotationPrintSource): QuotationPrintModel {
  const status = source.status as QuotationStatus;
  const revisionNumber = source.revisionNumber ?? 1;
  const discount = parseFloat(source.discountAmount ?? '0');
  const tax = parseFloat(source.taxAmount ?? '0');
  const vatRate = source.vatRate ? parseFloat(source.vatRate) : null;
  const items = buildLineItems(source);

  return {
    code: source.code,
    codeWithRevision: `${source.code} · v${revisionNumber}`,
    statusLabel: QUOTATION_STATUS_LABELS[status],
    documentDate: formatDocumentDate(source.createdAt),
    validUntil: source.validUntil ? formatDocumentDate(source.validUntil) : null,
    printedAt: formatDocumentDateTime(new Date()),
    company: GOLDENCARD_COMPANY_PROFILE,
    customer: {
      name: formatDocumentValue(source.customerNameSnapshot),
      phone: formatDocumentValue(source.customerPhoneSnapshot),
      installationAddress: formatDocumentValue(resolveInstallationAddress(source)),
      contactNote: resolveContactNote(source),
    },
    technicalRows: buildTechnicalRows(source),
    zoneSummary: buildZoneSummary(source),
    items,
    itemsFallback: items.length === 0,
    totals: {
      subtotal: formatCurrency(source.subtotal),
      discount: discount > 0 ? formatCurrency(source.discountAmount) : null,
      tax: tax > 0 ? formatCurrency(source.taxAmount) : null,
      vatRateLabel:
        vatRate != null && !isNaN(vatRate) && tax > 0 ? `${vatRate}%` : null,
      grandTotal: formatCurrency(source.grandTotal),
      showBreakdown: discount > 0 || tax > 0,
    },
    warrantyText: QUOTATION_PRINT_WARRANTY_TEXT,
    termsLines: QUOTATION_PRINT_TERMS_LINES.filter((line) => line.trim() !== ''),
    quotationNote: source.note?.trim() || null,
  };
}
