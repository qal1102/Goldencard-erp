import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { surveys } from './surveys';
import { users } from './users';

export const surveyEditLogs = pgTable(
  'survey_edit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    editedBy: uuid('edited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    editedAt: timestamp('edited_at').defaultNow().notNull(),
    note: text('note').notNull(),
    beforeStatus: varchar('before_status'),
    afterStatus: varchar('after_status'),
  },
  (table) => [
    index('survey_edit_logs_survey_id_edited_at_idx').on(table.surveyId, table.editedAt),
  ],
);

export type SurveyEditLog = typeof surveyEditLogs.$inferSelect;
export type NewSurveyEditLog = typeof surveyEditLogs.$inferInsert;
