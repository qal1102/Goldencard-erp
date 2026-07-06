import type { AppRole } from '@/lib/auth/roles';

export const INVENTORY_MANAGER_ROLES = [
  'admin',
  'director',
  'project_manager',
  'chief_engineer',
  'chief_accountant',
  'accountant',
] as const satisfies AppRole[];
