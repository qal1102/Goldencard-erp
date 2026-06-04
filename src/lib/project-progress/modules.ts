import { PROJECT_MODULE_KEYS, type ProjectModuleKey, type ProjectRecordRef } from './types';

export type ProjectModuleConfig = {
  key: ProjectModuleKey;
  title: string;
  shortCode: string;
  /** Main pipeline order; side modules (bom, inventory, payment) use high order + branch flag. */
  pipelineOrder: number;
  /** When false, UI may hide until provider populates the record. */
  implemented: boolean;
  buildHref: (entityId: string) => string;
};

/**
 * Main delivery pipeline (left → right on timeline UIs).
 * Side modules attach via providers without changing this order.
 */
export const PROJECT_DELIVERY_PIPELINE: ProjectModuleKey[] = [
  'lead',
  'survey',
  'quotation',
  'contract',
  'work_order',
  'installation',
  'handover',
  'warranty',
];

export const PROJECT_MODULE_CONFIG: Record<ProjectModuleKey, ProjectModuleConfig> = {
  lead: {
    key: 'lead',
    title: 'Cơ hội',
    shortCode: 'LEAD',
    pipelineOrder: 10,
    implemented: true,
    buildHref: (id) => `/crm/leads/${id}`,
  },
  survey: {
    key: 'survey',
    title: 'Phiếu khảo sát',
    shortCode: 'KS',
    pipelineOrder: 20,
    implemented: true,
    buildHref: (id) => `/surveys/${id}`,
  },
  quotation: {
    key: 'quotation',
    title: 'Báo giá',
    shortCode: 'BG',
    pipelineOrder: 30,
    implemented: true,
    buildHref: (id) => `/quotations/${id}`,
  },
  contract: {
    key: 'contract',
    title: 'Hợp đồng',
    shortCode: 'HD',
    pipelineOrder: 40,
    implemented: true,
    buildHref: (id) => `/contracts/${id}`,
  },
  work_order: {
    key: 'work_order',
    title: 'Lệnh thi công',
    shortCode: 'WO',
    pipelineOrder: 50,
    implemented: true,
    buildHref: (id) => `/work-orders/${id}`,
  },
  installation: {
    key: 'installation',
    title: 'Lắp đặt',
    shortCode: 'LT',
    pipelineOrder: 60,
    implemented: false,
    buildHref: (id) => `/installations/${id}`,
  },
  handover: {
    key: 'handover',
    title: 'Bàn giao',
    shortCode: 'BGIAO',
    pipelineOrder: 70,
    implemented: true,
    buildHref: (id) => `/handovers/${id}`,
  },
  warranty: {
    key: 'warranty',
    title: 'Bảo hành / CSKH',
    shortCode: 'BH',
    pipelineOrder: 80,
    implemented: true,
    buildHref: (id) => `/warranty/${id}`,
  },
  bom: {
    key: 'bom',
    title: 'BOM',
    shortCode: 'BOM',
    pipelineOrder: 200,
    implemented: false,
    buildHref: (id) => `/bom/${id}`,
  },
  inventory: {
    key: 'inventory',
    title: 'Kho',
    shortCode: 'KHO',
    pipelineOrder: 210,
    implemented: false,
    buildHref: (id) => `/inventory/${id}`,
  },
  payment: {
    key: 'payment',
    title: 'Thanh toán',
    shortCode: 'TT',
    pipelineOrder: 220,
    implemented: false,
    buildHref: (id) => `/payments/${id}`,
  },
};

export function buildRecordRef(input: {
  module: ProjectModuleKey;
  entityId: string;
  code: string;
  status: string;
  statusLabel: string;
  detail?: string | null;
  meta?: Record<string, unknown>;
}): ProjectRecordRef {
  const config = PROJECT_MODULE_CONFIG[input.module];
  return {
    module: input.module,
    entityId: input.entityId,
    code: input.code,
    status: input.status,
    statusLabel: input.statusLabel,
    href: config.buildHref(input.entityId),
    title: config.title,
    detail: input.detail ?? null,
    meta: input.meta,
  };
}

export function splitUpstreamDownstream(
  records: Partial<Record<ProjectModuleKey, ProjectRecordRef | null>>,
  primaryModule: ProjectModuleKey,
): { upstream: ProjectRecordRef[]; downstream: ProjectRecordRef[] } {
  const primaryOrder = PROJECT_MODULE_CONFIG[primaryModule].pipelineOrder;
  const upstream: ProjectRecordRef[] = [];
  const downstream: ProjectRecordRef[] = [];

  for (const key of PROJECT_MODULE_KEYS) {
    const ref = records[key];
    if (!ref) continue;
    const order = PROJECT_MODULE_CONFIG[key].pipelineOrder;
    if (order < primaryOrder) upstream.push(ref);
    else if (order > primaryOrder) downstream.push(ref);
  }

  upstream.sort(
    (a, b) =>
      PROJECT_MODULE_CONFIG[a.module].pipelineOrder -
      PROJECT_MODULE_CONFIG[b.module].pipelineOrder,
  );
  downstream.sort(
    (a, b) =>
      PROJECT_MODULE_CONFIG[a.module].pipelineOrder -
      PROJECT_MODULE_CONFIG[b.module].pipelineOrder,
  );

  return { upstream, downstream };
}
