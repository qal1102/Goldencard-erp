import { index, primaryKey, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles';
import { users } from './users';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('user_roles_user_id_idx').on(table.userId),
  ],
);

export type UserRole = typeof userRoles.$inferSelect;
