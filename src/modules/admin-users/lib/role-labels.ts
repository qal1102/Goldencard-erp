const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị hệ thống',
  director: 'Giám đốc / Quản lý',
  sales: 'Kinh doanh',
  project_manager: 'Quản lý dự án',
  chief_engineer: 'Kỹ sư trưởng',
  technician: 'Kỹ thuật viên',
  chief_accountant: 'Kế toán trưởng',
  accountant: 'Kế toán',
  customer_service: 'CSKH',
};

export function getRoleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

export function formatRoleNames(roleNames: string[]): string {
  return roleNames.map(getRoleLabel).join(', ');
}
