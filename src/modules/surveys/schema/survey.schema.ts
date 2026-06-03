import { z } from 'zod';

export const SURVEY_STATUSES = ['pending', 'assigned', 'completed', 'cancelled'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  pending: 'Chờ phân công',
  assigned: 'Đã phân công',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const ROOF_TYPES = ['flat', 'pitched', 'other'] as const;
export type RoofType = (typeof ROOF_TYPES)[number];
export const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  flat: 'Mái bằng',
  pitched: 'Mái dốc',
  other: 'Khác',
};

export const GRID_VOLTAGES = ['1_phase', '3_phase'] as const;
export type GridVoltage = (typeof GRID_VOLTAGES)[number];
export const GRID_VOLTAGE_LABELS: Record<GridVoltage, string> = {
  '1_phase': '1 pha',
  '3_phase': '3 pha',
};

export const SYSTEM_TYPES = ['grid_tie', 'hybrid', 'storage'] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];
export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  grid_tie: 'Hòa lưới (Grid-tie)',
  hybrid: 'Lai (Hybrid)',
  storage: 'Lưu trữ (Storage)',
};

export const POWER_PHASES = ['single_phase', 'three_phase'] as const;
export type PowerPhase = (typeof POWER_PHASES)[number];
export const POWER_PHASE_LABELS: Record<PowerPhase, string> = {
  single_phase: '1 pha',
  three_phase: '3 pha',
};

export const INSTALLATION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type InstallationDifficulty = (typeof INSTALLATION_DIFFICULTIES)[number];
export const INSTALLATION_DIFFICULTY_LABELS: Record<InstallationDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

export const PROJECT_TYPES = ['residential', 'commercial'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  residential: 'Dân cư',
  commercial: 'Commercial / Nhà máy',
};

export const PROJECT_SCALES = ['single', 'multi'] as const;
export type ProjectScale = (typeof PROJECT_SCALES)[number];
export const PROJECT_SCALE_LABELS: Record<ProjectScale, string> = {
  single: '1 khu / 1 mái',
  multi: 'Nhiều khu / nhiều mái',
};

export const createSurveySchema = z
  .object({
    customerId: z.string().uuid('ID khách hàng không hợp lệ').optional(),
    leadId: z.string().uuid('ID lead không hợp lệ').optional(),
    address: z.string().min(1, 'Địa chỉ là bắt buộc').max(1000, 'Địa chỉ quá dài'),
    province: z.string().max(100).optional(),
    scheduledAt: z.string().optional(),
    assignedTo: z.string().uuid('ID kỹ thuật viên không hợp lệ').nullable().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => Boolean(data.customerId) || Boolean(data.leadId), {
    message: 'Phải có khách hàng hoặc lead',
    path: ['customerId'],
  });
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

const intStringOptional = z
  .string()
  .max(10)
  .regex(/^\d*$/, 'Chỉ nhập số nguyên')
  .optional();

const numericStringOptional = z.string().max(20).optional();

function autoCalcZonePanelQuantity<
  T extends {
    recommendedSystemKw?: string;
    panelWattageW?: string;
    recommendedPanelQuantity?: string;
  },
>(zone: T): T {
  const kw = parseFloat(zone.recommendedSystemKw ?? '');
  const panelW = parseInt(zone.panelWattageW ?? '550', 10) || 550;
  if (Number.isFinite(kw) && kw > 0 && panelW > 0) {
    return {
      ...zone,
      panelWattageW: String(panelW),
      recommendedPanelQuantity: String(Math.ceil((kw * 1000) / panelW)),
    };
  }
  return { ...zone, panelWattageW: zone.panelWattageW ?? String(panelW) };
}

export const surveyZoneSchema = z
  .object({
    zoneName: z.string().min(1, 'Tên khu vực là bắt buộc').max(100),
    roofType: z.enum(ROOF_TYPES).optional(),
    roofMaterial: z.string().max(100).optional(),
    usableAreaM2: numericStringOptional,
    roofOrientation: z.string().max(50).optional(),
    roofTiltDeg: z
      .string()
      .max(3)
      .regex(/^\d*$/, 'Chỉ nhập số nguyên')
      .optional(),
    shadingNotes: z.string().max(2000).optional(),
    roofStructureCondition: z.string().max(2000).optional(),
    needsRoofReinforcement: z.boolean().optional(),
    recommendedSystemKw: z.string().max(10).optional(),
    panelWattageW: intStringOptional,
    recommendedPanelQuantity: intStringOptional,
    inverterLocation: z.string().max(500).optional(),
    cableRouteDistanceM: intStringOptional,
    cableRouteNotes: z.string().max(2000).optional(),
    installationDifficulty: z.enum(INSTALLATION_DIFFICULTIES).optional(),
    extraMaterialsNote: z.string().max(5000).optional(),
    installationPlanNote: z.string().max(5000).optional(),
  })
  .transform(autoCalcZonePanelQuantity);
export type SurveyZoneInput = z.infer<typeof surveyZoneSchema>;

export const updateSurveySchema = z
  .object({
  address: z.string().min(1, 'Địa chỉ là bắt buộc').max(1000).optional(),
  province: z.string().max(100).optional(),
  scheduledAt: z.string().optional(),
  projectType: z.enum(PROJECT_TYPES).optional(),
  projectScale: z.enum(PROJECT_SCALES).optional(),
  zones: z.array(surveyZoneSchema).optional(),
  roofType: z.enum(ROOF_TYPES).optional(),
  roofMaterial: z.string().max(100).optional(),
  // roofAreaM2 is passed as a numeric string (HTML input value) and converted in the action
  roofAreaM2: z.string().max(20).optional(),
  roofOrientation: z.string().max(50).optional(),
  // Integer fields are passed as strings from HTML inputs; converted to numbers in the action
  roofTiltDeg: z
    .string()
    .max(3)
    .regex(/^\d*$/, 'Chỉ nhập số nguyên')
    .optional(),
  shadingNotes: z.string().max(2000).optional(),
  floors: z
    .string()
    .max(3)
    .regex(/^\d*$/, 'Chỉ nhập số nguyên')
    .optional(),
  meterCapacityA: z
    .string()
    .max(6)
    .regex(/^\d*$/, 'Chỉ nhập số nguyên')
    .optional(),
  gridVoltage: z.enum(GRID_VOLTAGES).optional(),
  siteNotes: z.string().max(5000).optional(),
  internalNotes: z.string().max(2000).optional(),
  photosNote: z.string().max(2000).optional(),
  // Technical proposal fields
  recommendedSystemKw: z.string().max(10).optional(),
  panelWattageW: intStringOptional,
  recommendedPanelQuantity: intStringOptional,
  inverterType: z.string().max(100).optional(),
  inverterQuantity: intStringOptional,
  systemType: z.enum(SYSTEM_TYPES).optional(),
  powerPhase: z.enum(POWER_PHASES).optional(),
  roofStructureCondition: z.string().max(2000).optional(),
  needsRoofReinforcement: z.boolean().optional(),
  inverterLocation: z.string().max(500).optional(),
  cableRouteDistanceM: intStringOptional,
  mainBreakerCapacityA: intStringOptional,
  mainElectricalCabinetCondition: z.string().max(2000).optional(),
  needsElectricalCabinetUpgrade: z.boolean().optional(),
  hasGrounding: z.boolean().optional(),
  installationDifficulty: z.enum(INSTALLATION_DIFFICULTIES).optional(),
  extraMaterialsNote: z.string().max(5000).optional(),
  installationPlanNote: z.string().max(5000).optional(),
  // Project-level electrical infrastructure
  plannedInverterArea: z.string().max(2000).optional(),
  inverterAreaNearMainPower: z.boolean().optional(),
  inverterAreaDistanceToMainCabinetM: intStringOptional,
  inverterAreaCleanDryVentilated: z.boolean().optional(),
  inverterAreaHasShelter: z.boolean().optional(),
  inverterAreaRiskNotes: z.string().max(5000).optional(),
  needsInverterShelterOrRack: z.boolean().optional(),
  mainPowerConnectionPoint: z.string().max(2000).optional(),
  mainCabinetLocation: z.string().max(2000).optional(),
  groundingLocation: z.string().max(2000).optional(),
  mainCableRouteNotes: z.string().max(5000).optional(),
  maintenanceAccessNotes: z.string().max(5000).optional(),
  fireSafetyNotes: z.string().max(5000).optional(),
  generalTechnicalRiskNotes: z.string().max(5000).optional(),
  /** Required when correcting a completed survey */
  editNote: z.string().max(2000).optional(),
})
  .superRefine((data, ctx) => {
    if (data.zones === undefined) return;

    const scale = data.projectScale ?? 'single';

    if (scale === 'single' && data.zones.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Quy mô 1 khu yêu cầu đúng 1 khu vực',
        path: ['zones'],
      });
    }

    if (scale === 'multi' && data.zones.length < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Quy mô nhiều khu yêu cầu ít nhất 1 khu vực',
        path: ['zones'],
      });
    }
  });
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;

export const updateSurveyStatusSchema = z.object({
  status: z.enum(SURVEY_STATUSES),
  assignedTo: z.string().uuid('ID kỹ thuật viên không hợp lệ').nullable().optional(),
});
export type UpdateSurveyStatusInput = z.infer<typeof updateSurveyStatusSchema>;

export const surveyFiltersSchema = z.object({
  status: z.enum(SURVEY_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
});
export type SurveyFilters = z.infer<typeof surveyFiltersSchema>;

export { updateSurveyAddressSchema } from '@/lib/address/address.schema';
export type { UpdateSurveyAddressInput } from '@/lib/address/address.schema';

export const checkInSurveyLocationSchema = z.object({
  latitude: z.number().min(-90, 'Vĩ độ không hợp lệ').max(90, 'Vĩ độ không hợp lệ'),
  longitude: z
    .number()
    .min(-180, 'Kinh độ không hợp lệ')
    .max(180, 'Kinh độ không hợp lệ'),
  accuracy: z.number().min(0).optional(),
  note: z.string().max(2000).optional(),
});
export type CheckInSurveyLocationInput = z.infer<typeof checkInSurveyLocationSchema>;
