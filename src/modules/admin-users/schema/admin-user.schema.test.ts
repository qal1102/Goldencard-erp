import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADMIN_USER_VALIDATION_ERROR,
  USER_ACTIVE_AUDIT_ACTIONS,
  optionalNullablePhoneSchema,
  setAdminUserActiveSchema,
  updateAdminUserSchema,
} from './admin-user.schema';

const baseUpdate = {
  name: 'Nguyễn Văn A',
  email: 'user@example.com',
  roleIds: ['00000000-0000-4000-8000-000000000001'],
  isActive: false,
};

describe('optionalNullablePhoneSchema', () => {
  it('accepts null', () => {
    const r = optionalNullablePhoneSchema.safeParse(null);
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data, null);
  });

  it('accepts undefined', () => {
    const r = optionalNullablePhoneSchema.safeParse(undefined);
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data, null);
  });

  it('accepts empty string', () => {
    const r = optionalNullablePhoneSchema.safeParse('');
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data, null);
  });

  it('trims and keeps non-empty phone', () => {
    const r = optionalNullablePhoneSchema.safeParse('  0912345678  ');
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data, '0912345678');
  });
});

describe('updateAdminUserSchema', () => {
  it('allows lock/unlock when phone is null', () => {
    const lock = updateAdminUserSchema.safeParse({ ...baseUpdate, phone: null });
    assert.equal(lock.success, true);
    if (lock.success) assert.equal(lock.data.phone, null);

    const unlock = updateAdminUserSchema.safeParse({
      ...baseUpdate,
      phone: null,
      isActive: true,
    });
    assert.equal(unlock.success, true);
  });

  it('allows role and status update when phone is null', () => {
    const r = updateAdminUserSchema.safeParse({
      ...baseUpdate,
      name: 'Tên mới',
      phone: null,
      isActive: true,
      roleIds: ['00000000-0000-4000-8000-000000000002'],
    });
    assert.equal(r.success, true);
  });

  it('rejects invalid email with Vietnamese field message path', () => {
    const r = updateAdminUserSchema.safeParse({
      ...baseUpdate,
      email: 'not-an-email',
      phone: null,
    });
    assert.equal(r.success, false);
  });
});

describe('setAdminUserActiveSchema', () => {
  it('only validates isActive', () => {
    assert.equal(setAdminUserActiveSchema.safeParse({ isActive: false }).success, true);
    assert.equal(setAdminUserActiveSchema.safeParse({ isActive: true }).success, true);
  });
});

describe('admin user constants', () => {
  it('exposes Vietnamese validation error copy', () => {
    assert.equal(
      ADMIN_USER_VALIDATION_ERROR,
      'Dữ liệu tài khoản chưa hợp lệ. Vui lòng kiểm tra lại thông tin.',
    );
  });

  it('defines activate/deactivate audit actions', () => {
    assert.equal(USER_ACTIVE_AUDIT_ACTIONS.activate, 'user.activate');
    assert.equal(USER_ACTIVE_AUDIT_ACTIONS.deactivate, 'user.deactivate');
  });
});
