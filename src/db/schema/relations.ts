import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { leadActivities } from './lead-activities';
import { leads } from './leads';
import { surveys } from './surveys';
import { users } from './users';

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
    relationName: 'lead_assigned_user',
  }),
  createdByUser: one(users, {
    fields: [leads.createdBy],
    references: [users.id],
    relationName: 'lead_created_by_user',
  }),
  convertedByUser: one(users, {
    fields: [leads.convertedBy],
    references: [users.id],
    relationName: 'lead_converted_by_user',
  }),
  activities: many(leadActivities),
  customer: one(customers, {
    fields: [leads.id],
    references: [customers.leadId],
    relationName: 'lead_customer',
  }),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  createdByUser: one(users, {
    fields: [leadActivities.createdBy],
    references: [users.id],
    relationName: 'activity_created_by_user',
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  lead: one(leads, {
    fields: [customers.leadId],
    references: [leads.id],
    relationName: 'lead_customer',
  }),
  convertedByUser: one(users, {
    fields: [customers.convertedBy],
    references: [users.id],
    relationName: 'customer_converted_by_user',
  }),
  surveys: many(surveys),
}));

export const surveysRelations = relations(surveys, ({ one }) => ({
  customer: one(customers, {
    fields: [surveys.customerId],
    references: [customers.id],
    relationName: 'survey_customer',
  }),
  lead: one(leads, {
    fields: [surveys.leadId],
    references: [leads.id],
    relationName: 'survey_lead',
  }),
  assignedUser: one(users, {
    fields: [surveys.assignedTo],
    references: [users.id],
    relationName: 'survey_assigned_user',
  }),
  createdByUser: one(users, {
    fields: [surveys.createdBy],
    references: [users.id],
    relationName: 'survey_created_by_user',
  }),
}));
