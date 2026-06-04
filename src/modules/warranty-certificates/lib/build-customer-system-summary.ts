import 'server-only';

import { buildFullAddress } from '@/lib/address/format-address';

type SurveyZone = {
  recommendedSystemKw: string | null;
  panelWattageW: number | null;
  recommendedPanelQuantity: number | null;
};

type SurveyLike = {
  recommendedSystemKw: string | null;
  panelWattageW: number | null;
  recommendedPanelQuantity: number | null;
  inverterType: string | null;
  inverterQuantity: number | null;
  zones?: SurveyZone[];
};

type QuotationItem = {
  productName: string;
  quantity: string;
};

export type CustomerSystemSummaryRow = { label: string; value: string };

function parseKw(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sumSystemKw(survey: SurveyLike): number {
  if (survey.zones?.length) {
    return survey.zones.reduce((sum, z) => sum + parseKw(z.recommendedSystemKw), 0);
  }
  return parseKw(survey.recommendedSystemKw);
}

function sumPanelQty(survey: SurveyLike): number {
  if (survey.zones?.length) {
    return survey.zones.reduce(
      (sum, z) => sum + (z.recommendedPanelQuantity ?? 0),
      0,
    );
  }
  return survey.recommendedPanelQuantity ?? 0;
}

export function buildCustomerSystemSummary(
  survey: SurveyLike | null | undefined,
  quotationItems?: QuotationItem[],
): CustomerSystemSummaryRow[] {
  const rows: CustomerSystemSummaryRow[] = [];

  if (survey) {
    const totalKw = sumSystemKw(survey);
    const totalPanels = sumPanelQty(survey);

    if (totalKw > 0) {
      rows.push({
        label: 'Công suất hệ thống',
        value: `${totalKw.toLocaleString('vi-VN')} kWp`,
      });
    }
    if (totalPanels > 0) {
      const watt = survey.panelWattageW ? ` (${survey.panelWattageW}W)` : '';
      rows.push({
        label: 'Tấm pin',
        value: `${totalPanels} tấm${watt}`,
      });
    }
    if (survey.inverterType) {
      const qty = survey.inverterQuantity ? ` × ${survey.inverterQuantity}` : '';
      rows.push({ label: 'Inverter', value: `${survey.inverterType}${qty}` });
    }
  }

  if (rows.length === 0 && quotationItems?.length) {
    const panelItem = quotationItems.find((i) =>
      i.productName.toLowerCase().includes('tấm pin'),
    );
    if (panelItem) {
      rows.push({ label: 'Hạng mục chính', value: panelItem.productName });
    }
  }

  return rows;
}

export function resolveCustomerInstallationAddress(input: {
  workOrder?: { installationAddress: string | null; province: string | null } | null;
  survey?: { address: string | null; province: string | null } | null;
  lead?: { address: string | null; province: string | null } | null;
  customer?: { address: string | null; province: string | null } | null;
}): string {
  if (input.workOrder) {
    const fromWo = buildFullAddress(input.workOrder.installationAddress, input.workOrder.province);
    if (fromWo) return fromWo;
  }
  if (input.survey) {
    const fromSurvey = buildFullAddress(input.survey.address, input.survey.province);
    if (fromSurvey) return fromSurvey;
  }
  if (input.lead) {
    const fromLead = buildFullAddress(input.lead.address, input.lead.province);
    if (fromLead) return fromLead;
  }
  return buildFullAddress(input.customer?.address, input.customer?.province) || '—';
}
