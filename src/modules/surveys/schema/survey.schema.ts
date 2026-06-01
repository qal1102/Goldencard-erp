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

export const updateSurveySchema = z.object({
  address: z.string().min(1, 'Địa chỉ là bắt buộc').max(1000).optional(),
  province: z.string().max(100).optional(),
  scheduledAt: z.string().optional(),
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
  photosNote: z.string().max(500).optional(),
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
