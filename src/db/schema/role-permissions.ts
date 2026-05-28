import { primaryKey, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { permissions } from './permissions';
import { roles } from './roles';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export type RolePermission = typeof rolePermissions.$inferSelect;
