import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRecordRef } from './modules';
import { pickProjectStageResolution } from './pick-stage-resolution';
import { ensureProjectProgressRegistry } from './resolvers';
import type { ProjectContext } from './types';

ensureProjectProgressRegistry();

function makeCtx(records: ProjectContext['records']): ProjectContext {
  return {
    anchor: { module: 'lead', entityId: 'lead-1' },
    records: {
      lead: buildRecordRef({
        module: 'lead',
        entityId: 'lead-1',
        code: 'LEAD-0001',
        status: 'awaiting_survey',
        statusLabel: 'Chờ khảo sát',
      }),
      ...records,
    },
    responsible: null,
  };
}

describe('pickProjectStageResolution', () => {
  it('prefers completed work order over manual lead awaiting_survey', () => {
    const resolution = pickProjectStageResolution(
      makeCtx({
        survey: buildRecordRef({
          module: 'survey',
          entityId: 's1',
          code: 'KS-0001',
          status: 'completed',
          statusLabel: 'Hoàn thành',
        }),
        work_order: buildRecordRef({
          module: 'work_order',
          entityId: 'wo1',
          code: 'LTC-0001',
          status: 'completed',
          statusLabel: 'Hoàn thành thi công',
        }),
      }),
    );

    assert.ok(resolution);
    assert.equal(resolution.currentStageLabel, 'Thi công hoàn thành');
    assert.equal(resolution.nextAction, 'Bàn giao');
    assert.equal(resolution.primaryModule, 'work_order');
  });

  it('prefers handover over completed work order', () => {
    const resolution = pickProjectStageResolution(
      makeCtx({
        work_order: buildRecordRef({
          module: 'work_order',
          entityId: 'wo1',
          code: 'LTC-0001',
          status: 'completed',
          statusLabel: 'Hoàn thành thi công',
        }),
        handover: buildRecordRef({
          module: 'handover',
          entityId: 'h1',
          code: 'BB-0001',
          status: 'draft',
          statusLabel: 'Nháp',
        }),
      }),
    );

    assert.ok(resolution);
    assert.equal(resolution.currentStageLabel, 'Chờ bàn giao');
    assert.equal(resolution.nextAction, 'Hoàn tất bàn giao');
    assert.equal(resolution.primaryModule, 'handover');
  });

  it('prefers signed contract when no work order', () => {
    const resolution = pickProjectStageResolution(
      makeCtx({
        contract: buildRecordRef({
          module: 'contract',
          entityId: 'c1',
          code: 'HD-0001',
          status: 'signed',
          statusLabel: 'Đã ký',
        }),
      }),
    );

    assert.ok(resolution);
    assert.equal(resolution.currentStageLabel, 'Hợp đồng đã ký');
    assert.equal(resolution.nextAction, 'Tạo lệnh thi công');
  });

  it('prefers accepted quotation when no contract', () => {
    const resolution = pickProjectStageResolution(
      makeCtx({
        quotation: buildRecordRef({
          module: 'quotation',
          entityId: 'q1',
          code: 'BG-0001',
          status: 'accepted',
          statusLabel: 'Khách đồng ý',
        }),
      }),
    );

    assert.ok(resolution);
    assert.equal(resolution.nextAction, 'Lập hợp đồng');
  });
});
