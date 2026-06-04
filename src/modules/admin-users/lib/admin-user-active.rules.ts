export function evaluateCanSetActive(params: {
  isActive: boolean;
  targetIsSuperAdmin: boolean;
  targetUserId: string;
  actorUserId: string;
}): { ok: true } | { ok: false; error: string } {
  if (params.isActive) return { ok: true };

  if (params.targetIsSuperAdmin) {
    return {
      ok: false,
      error: 'Không thể khóa tài khoản Super Admin.',
    };
  }

  if (params.targetUserId === params.actorUserId) {
    return {
      ok: false,
      error: 'Không thể tự khóa tài khoản của chính bạn.',
    };
  }

  return { ok: true };
}
