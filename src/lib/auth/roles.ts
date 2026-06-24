export type AppRole =
  | 'admin'
  | 'director'
  | 'sales'
  | 'project_manager'
  | 'chief_engineer'
  | 'technician'
  | 'chief_accountant'
  | 'accountant'
  | 'customer_service';

export function hasRole(userRoles: string[], ...required: AppRole[]): boolean {
  return required.some((role) => userRoles.includes(role));
}

export function requireRole(userRoles: string[], ...required: AppRole[]): void {
  if (!hasRole(userRoles, ...required)) {
    throw new Error('Unauthorized');
  }
}
