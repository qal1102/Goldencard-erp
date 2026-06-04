import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCanSetActive } from './admin-user-active.rules';

describe('evaluateCanSetActive', () => {
  it('allows activation without restrictions', () => {
    const r = evaluateCanSetActive({
      isActive: true,
      targetIsSuperAdmin: true,
      targetUserId: 'user-a',
      actorUserId: 'user-a',
    });
    assert.deepEqual(r, { ok: true });
  });

  it('blocks Super Admin from being deactivated', () => {
    const r = evaluateCanSetActive({
      isActive: false,
      targetIsSuperAdmin: true,
      targetUserId: 'super-1',
      actorUserId: 'actor-1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.error, /Super Admin/);
    }
  });

  it('blocks actor from deactivating themselves', () => {
    const r = evaluateCanSetActive({
      isActive: false,
      targetIsSuperAdmin: false,
      targetUserId: 'actor-1',
      actorUserId: 'actor-1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.error, /tự khóa/);
    }
  });

  it('allows deactivating another non-super-admin user', () => {
    const r = evaluateCanSetActive({
      isActive: false,
      targetIsSuperAdmin: false,
      targetUserId: 'user-b',
      actorUserId: 'actor-1',
    });
    assert.deepEqual(r, { ok: true });
  });
});
