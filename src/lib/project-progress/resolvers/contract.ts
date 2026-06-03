import { getStageDefinition } from '../registry';
import type { ProjectContext, ProjectStageResolution } from '../types';
import type { ContractStatus } from '@/modules/contracts/schema/contract.schema';

export function resolveContractStage(ctx: ProjectContext): ProjectStageResolution | null {
  if (ctx.records.work_order) return null;

  const contract = ctx.records.contract;
  if (!contract) return null;

  const status = contract.status as ContractStatus;

  if (status === 'cancelled') return null;

  if (status === 'signed') {
    const stage = getStageDefinition('contract_active');
    return {
      stage,
      dashboardStatus: 'contract_active',
      currentStageLabel: 'Hợp đồng đã ký',
      nextAction: 'Tạo lệnh thi công',
      primaryModule: 'contract',
    };
  }

  if (status === 'prepared') {
    const stage = getStageDefinition('contract_draft');
    return {
      stage,
      dashboardStatus: 'contract_draft',
      currentStageLabel: 'Chờ ký hợp đồng',
      nextAction: 'Ký hợp đồng với khách',
      primaryModule: 'contract',
    };
  }

  if (status === 'draft') {
    const stage = getStageDefinition('contract_draft');
    return {
      stage,
      dashboardStatus: 'contract_draft',
      currentStageLabel: 'Hợp đồng nháp',
      nextAction: 'Chuyển sang chờ ký',
      primaryModule: 'contract',
    };
  }

  return null;
}
