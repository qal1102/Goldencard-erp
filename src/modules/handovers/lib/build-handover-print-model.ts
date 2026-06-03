import 'server-only';

import { buildFullAddress } from '@/lib/address/format-address';
import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';
import {
  formatDocumentDate,
  formatDocumentDateTime,
  formatDocumentValue,
} from '@/lib/documents/format-document-value';
import { computeSurveyAggregates } from '@/modules/surveys/lib/survey-aggregates';
import type { HandoverStatus } from '../schema/handover.schema';
import type { HandoverPrintSource } from './handover-print.queries';

const AGREEMENT_FALLBACK = 'Theo báo giá/hợp đồng đã thống nhất';

export type HandoverPrintSystemRow = {
  label: string;
  value: string;
};

export type HandoverPrintEquipmentItem = {
  index: number;
  name: string;
  quantity: string;
  unit: string;
  note: string;
};

export type HandoverPrintModel = {
  code: string;
  isCancelled: boolean;
  handoverDate: string;
  printedAt: string;
  company: typeof GOLDENCARD_COMPANY_PROFILE;
  customer: {
    name: string;
    phone: string;
    installationAddress: string;
    receiverName: string | null;
  };
  basisText: string;
  systemRows: HandoverPrintSystemRow[];
  equipmentItems: HandoverPrintEquipmentItem[];
  equipmentFallback: boolean;
  handover: {
    note: string | null;
    documentLinks: string[];
    handedOverBy: string | null;
  };
  signatures: {
    goldenCardName: string | null;
    customerName: string | null;
  };
};

type QuotationItemSource = NonNullable<HandoverPrintSource['quotation']>['items'][number];

function resolveInstallationAddress(source: HandoverPrintSource): string {
  const workOrder = source.workOrder;
  if (workOrder) {
    const fromWorkOrder = buildFullAddress(workOrder.installationAddress, workOrder.province);
    if (fromWorkOrder) return fromWorkOrder;
  }

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
      if (wattMatch) {
        panelWattage = `${wattMatch[1]} W/tấm`;
      }
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

function resolveSystemSummary(source: HandoverPrintSource) {
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
    if (wattage) {
      panelWattage = `${wattage} W/tấm`;
    }
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

function buildSystemRows(source: HandoverPrintSource): HandoverPrintSystemRow[] {
  const system = resolveSystemSummary(source);
  const rows: HandoverPrintSystemRow[] = [
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

  const completedAt = source.workOrder?.completedAt;
  if (completedAt) {
    rows.push({
      label: 'Ngày hoàn thành thi công',
      value: formatDocumentDateTime(completedAt),
    });
  }

  const assignedTeam = source.workOrder?.assignedUser?.name?.trim();
  if (assignedTeam) {
    rows.push({
      label: 'Đơn vị/người thi công phụ trách',
      value: assignedTeam,
    });
  }

  return rows;
}

function buildEquipmentItems(source: HandoverPrintSource): HandoverPrintEquipmentItem[] {
  const items = source.quotation?.items ?? [];
  return items.map((item, index) => ({
    index: index + 1,
    name: item.productName,
    quantity: formatQuantity(item.quantity) || '—',
    unit: item.unit,
    note: item.description?.trim() ?? '',
  }));
}

function optionalCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed || null;
}

const GENERIC_PRINT_SIGNER_NAMES = new Set(['admin', 'administrator', 'system']);

function resolvePrintSignerName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (GENERIC_PRINT_SIGNER_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function buildBasisText(source: HandoverPrintSource): string {
  const contractCode = optionalCode(source.contract?.code);
  const quotationCode = optionalCode(source.quotation?.code);

  if (contractCode && quotationCode) {
    return `Biên bản này được lập căn cứ theo hợp đồng số ${contractCode} và báo giá số ${quotationCode} đã được hai bên thống nhất.`;
  }
  if (contractCode) {
    return `Biên bản này được lập căn cứ theo hợp đồng số ${contractCode} đã được hai bên thống nhất.`;
  }
  if (quotationCode) {
    return `Biên bản này được lập căn cứ theo báo giá số ${quotationCode} đã được hai bên thống nhất.`;
  }
  return 'Biên bản này được lập theo thỏa thuận giữa GoldenCard và khách hàng.';
}

export function buildHandoverPrintModel(source: HandoverPrintSource): HandoverPrintModel {
  const status = source.status as HandoverStatus;
  const documentLinks = (source.documentLinks ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const equipmentItems = buildEquipmentItems(source);
  const note = source.note?.trim() || null;
  const receiverName = source.customerReceiverName?.trim() || null;

  return {
    code: source.code,
    isCancelled: status === 'cancelled',
    handoverDate: source.handoverAt
      ? formatDocumentDate(source.handoverAt)
      : formatDocumentDate(new Date()),
    printedAt: formatDocumentDateTime(new Date()),
    company: GOLDENCARD_COMPANY_PROFILE,
    customer: {
      name: formatDocumentValue(source.customer?.fullName),
      phone: formatDocumentValue(source.customer?.phone),
      installationAddress: formatDocumentValue(resolveInstallationAddress(source)),
      receiverName,
    },
    basisText: buildBasisText(source),
    systemRows: buildSystemRows(source),
    equipmentItems,
    equipmentFallback: equipmentItems.length === 0,
    handover: {
      note,
      documentLinks,
      handedOverBy: source.handedOverByUser?.name?.trim() || null,
    },
    signatures: {
      goldenCardName: resolvePrintSignerName(source.handedOverByUser?.name),
      customerName: receiverName,
    },
  };
}
