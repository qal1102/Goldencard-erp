import 'server-only';

import { buildFullAddress } from '@/lib/address/format-address';
import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import {
  formatDocumentDate,
  formatDocumentValue,
} from '@/lib/documents/format-document-value';
import { computeSurveyAggregates } from '@/modules/surveys/lib/survey-aggregates';
import type { ContractStatus } from '../schema/contract.schema';
import type { ContractPrintSource } from './contract-print.queries';

const AGREEMENT_FALLBACK = 'Theo báo giá đã được hai bên thống nhất';
const PAYMENT_DEFAULT =
  'Điều khoản thanh toán thực hiện theo thỏa thuận giữa hai bên.';
const VALUE_FOOTNOTE =
  'Giá trị trên được xác định theo báo giá đã được khách hàng đồng ý.';

const GENERIC_PRINT_SIGNER_NAMES = new Set(['admin', 'administrator', 'system']);

export type ContractPrintSystemRow = {
  label: string;
  value: string;
};

export type ContractPrintScopeItem = {
  index: number;
  name: string;
  quantity: string;
  unit: string;
  note: string;
};

const CONTRACT_BASIS_TEXT =
  'Căn cứ theo báo giá/phương án thi công đã được hai bên thống nhất, GoldenCard và khách hàng thỏa thuận ký hợp đồng thi công với các nội dung sau.';

export type ContractPrintModel = {
  code: string;
  isCancelled: boolean;
  createdAt: string;
  signedAt: string | null;
  company: typeof GOLDENCARD_COMPANY_PROFILE;
  parties: {
    goldenCardRepresentative: string | null;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    installationAddress: string;
    customerSignerName: string | null;
  };
  basisText: string;
  systemRows: ContractPrintSystemRow[];
  value: {
    contractValue: string;
    subtotal: string | null;
    discount: string | null;
    tax: string | null;
    vatRateLabel: string | null;
    showBreakdown: boolean;
    footnote: string;
  };
  scopeItems: ContractPrintScopeItem[];
  scopeFallback: boolean;
  paymentText: string;
  contractNote: string | null;
  signedDocumentUrl: string | null;
  responsibilities: string[];
  signatures: {
    goldenCardName: string | null;
    customerName: string | null;
  };
};

type QuotationItemSource = NonNullable<ContractPrintSource['quotation']>['items'][number];

function resolvePrintSignerName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (GENERIC_PRINT_SIGNER_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

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

function resolveInstallationAddress(source: ContractPrintSource): string {
  const survey = source.survey;
  if (survey) {
    const fromSurvey = buildFullAddress(survey.address, survey.province);
    if (fromSurvey) return fromSurvey;
  }

  const lead = source.lead;
  if (lead) {
    const fromLead = buildFullAddress(lead.address, lead.province);
    if (fromLead) return fromLead;
  }

  return buildFullAddress(source.customer?.address, source.customer?.province);
}

function resolveCustomerAddress(source: ContractPrintSource): string {
  return buildFullAddress(source.customer?.address, source.customer?.province);
}

function resolveSystemSummary(source: ContractPrintSource) {
  const survey = source.survey;
  const quotationItems = source.quotation?.items ?? [];
  const fromQuotation = inferFromQuotationItems(quotationItems);

  let systemKw = '';
  let panelCount = '';
  let panelWattage = '';
  const inverterType = survey?.inverterType ?? null;
  const inverterQuantity = survey?.inverterQuantity ?? null;

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
  }

  if (!panelCount && fromQuotation.panelCount) panelCount = fromQuotation.panelCount;
  if (!panelWattage && fromQuotation.panelWattage) panelWattage = fromQuotation.panelWattage;

  const inverterParts: string[] = [];
  if (inverterType) inverterParts.push(inverterType);
  if (inverterQuantity != null && inverterQuantity > 0) {
    inverterParts.push(`${inverterQuantity} bộ`);
  }
  let inverter = inverterParts.length > 0 ? inverterParts.join(' · ') : '';
  if (!inverter && fromQuotation.inverter) inverter = fromQuotation.inverter;

  if (!systemKw && panelCount && panelWattage) {
    const countMatch = panelCount.match(/(\d+)/);
    const wattMatch = panelWattage.match(/(\d+)/);
    if (countMatch && wattMatch) {
      const kw = (Number(countMatch[1]) * Number(wattMatch[1])) / 1000;
      if (kw > 0) systemKw = `${Number(kw.toFixed(2))} kWp`;
    }
  }

  return { systemKw, panelCount, panelWattage, inverter };
}

function withFallback(value: string, useFallback: boolean): string {
  return value || (useFallback ? AGREEMENT_FALLBACK : '');
}

function buildSystemRows(source: ContractPrintSource): ContractPrintSystemRow[] {
  const system = resolveSystemSummary(source);
  const rows: ContractPrintSystemRow[] = [
    { label: 'Địa chỉ lắp đặt', value: formatDocumentValue(resolveInstallationAddress(source)) },
    { label: 'Loại hệ thống', value: 'Hệ thống điện mặt trời' },
  ];

  const technicalRows: Array<{ label: string; value: string }> = [
    { label: 'Công suất hệ thống', value: withFallback(system.systemKw, true) },
    { label: 'Số lượng tấm pin', value: withFallback(system.panelCount, true) },
    { label: 'Công suất tấm pin', value: withFallback(system.panelWattage, true) },
    { label: 'Inverter / số lượng inverter', value: withFallback(system.inverter, true) },
  ];

  for (const row of technicalRows) {
    if (row.value) rows.push(row);
  }

  return rows;
}

function buildScopeItems(source: ContractPrintSource): ContractPrintScopeItem[] {
  const items = source.quotation?.items ?? [];
  return items.map((item, index) => ({
    index: index + 1,
    name: item.productName,
    quantity: formatQuantity(item.quantity) || '—',
    unit: item.unit,
    note: item.description?.trim() ?? '',
  }));
}

function buildBasisText(source: ContractPrintSource): string {
  const quotationCode = source.quotation?.code?.trim();
  if (quotationCode) {
    return `${CONTRACT_BASIS_TEXT} (tham chiếu: ${quotationCode})`;
  }
  return CONTRACT_BASIS_TEXT;
}

function buildValueSection(source: ContractPrintSource) {
  const quotation = source.quotation;
  const discount = parseFloat(quotation?.discountAmount ?? '0');
  const tax = parseFloat(quotation?.taxAmount ?? '0');
  const vatRate = quotation?.vatRate ? parseFloat(quotation.vatRate) : null;

  return {
    contractValue: formatCurrency(source.contractValue),
    subtotal: quotation ? formatCurrency(quotation.subtotal) : null,
    discount: discount > 0 && quotation ? formatCurrency(quotation.discountAmount) : null,
    tax: tax > 0 && quotation ? formatCurrency(quotation.taxAmount) : null,
    vatRateLabel:
      vatRate != null && !isNaN(vatRate) && tax > 0 ? `${vatRate}%` : null,
    showBreakdown: Boolean(quotation && (discount > 0 || tax > 0)),
    footnote: VALUE_FOOTNOTE,
  };
}

const RESPONSIBILITY_CLAUSES = [
  'GoldenCard thực hiện thi công theo nội dung đã thống nhất.',
  'Khách hàng phối hợp cung cấp mặt bằng và điều kiện thi công phù hợp.',
  'Hai bên nghiệm thu và bàn giao sau khi hoàn thành thi công.',
  'Bảo hành và chăm sóc sau bàn giao theo chính sách hoặc thỏa thuận áp dụng.',
] as const;

export function buildContractPrintModel(source: ContractPrintSource): ContractPrintModel {
  const status = source.status as ContractStatus;
  const scopeItems = buildScopeItems(source);
  const contractNote = source.note?.trim() || null;

  return {
    code: source.code,
    isCancelled: status === 'cancelled',
    createdAt: formatDocumentDate(source.createdAt),
    signedAt:
      status === 'signed' && source.signedAt
        ? formatDocumentDate(source.signedAt)
        : null,
    company: GOLDENCARD_COMPANY_PROFILE,
    parties: {
      goldenCardRepresentative: resolvePrintSignerName(source.goldenCardSignerName),
      customerName: formatDocumentValue(source.customer?.fullName ?? source.lead?.fullName),
      customerPhone: formatDocumentValue(source.customer?.phone),
      customerAddress: formatDocumentValue(resolveCustomerAddress(source)),
      installationAddress: formatDocumentValue(resolveInstallationAddress(source)),
      customerSignerName: resolvePrintSignerName(source.customerSignerName),
    },
    basisText: buildBasisText(source),
    systemRows: buildSystemRows(source),
    value: buildValueSection(source),
    scopeItems,
    scopeFallback: scopeItems.length === 0,
    paymentText: PAYMENT_DEFAULT,
    contractNote,
    signedDocumentUrl: source.signedDocumentUrl?.trim() || null,
    responsibilities: [...RESPONSIBILITY_CLAUSES],
    signatures: {
      goldenCardName: resolvePrintSignerName(source.goldenCardSignerName),
      customerName: resolvePrintSignerName(source.customerSignerName),
    },
  };
}
