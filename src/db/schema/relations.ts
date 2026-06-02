import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { leadActivities } from './lead-activities';
import { notifications } from './notifications';
import { leads } from './leads';
import { quotationEditLogs } from './quotation-edit-logs';
import { quotationExports } from './quotation-exports';
import { quotationItems } from './quotation-items';
import { quotations } from './quotations';
import { surveyEditLogs } from './survey-edit-logs';
import { surveyZones } from './survey-zones';
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
  lastContactedByUser: one(users, {
    fields: [leads.lastContactedBy],
    references: [users.id],
    relationName: 'lead_last_contacted_by_user',
  }),
  activities: many(leadActivities),
  linkedCustomer: one(customers, {
    fields: [leads.customerId],
    references: [customers.id],
    relationName: 'lead_linked_customer',
  }),
  customer: one(customers, {
    fields: [leads.id],
    references: [customers.leadId],
    relationName: 'lead_converted_customer',
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
    relationName: 'lead_converted_customer',
  }),
  linkedLeads: many(leads, { relationName: 'lead_linked_customer' }),
  convertedByUser: one(users, {
    fields: [customers.convertedBy],
    references: [users.id],
    relationName: 'customer_converted_by_user',
  }),
  surveys: many(surveys),
  quotations: many(quotations),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
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
  checkedInByUser: one(users, {
    fields: [surveys.checkedInBy],
    references: [users.id],
    relationName: 'survey_checked_in_by_user',
  }),
  quotations: many(quotations, { relationName: 'survey_quotation' }),
  zones: many(surveyZones, { relationName: 'survey_zone' }),
  editLogs: many(surveyEditLogs),
}));

export const surveyEditLogsRelations = relations(surveyEditLogs, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyEditLogs.surveyId],
    references: [surveys.id],
  }),
  editedByUser: one(users, {
    fields: [surveyEditLogs.editedBy],
    references: [users.id],
    relationName: 'survey_edit_edited_by_user',
  }),
}));

export const surveyZonesRelations = relations(surveyZones, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyZones.surveyId],
    references: [surveys.id],
    relationName: 'survey_zone',
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
    relationName: 'quotation_customer',
  }),
  survey: one(surveys, {
    fields: [quotations.surveyId],
    references: [surveys.id],
    relationName: 'survey_quotation',
  }),
  createdByUser: one(users, {
    fields: [quotations.createdBy],
    references: [users.id],
    relationName: 'quotation_created_by_user',
  }),
  updatedByUser: one(users, {
    fields: [quotations.updatedBy],
    references: [users.id],
    relationName: 'quotation_updated_by_user',
  }),
  acceptedByUser: one(users, {
    fields: [quotations.acceptedBy],
    references: [users.id],
    relationName: 'quotation_accepted_by_user',
  }),
  sentByUser: one(users, {
    fields: [quotations.sentBy],
    references: [users.id],
    relationName: 'quotation_sent_by_user',
  }),
  respondedByUser: one(users, {
    fields: [quotations.respondedBy],
    references: [users.id],
    relationName: 'quotation_responded_by_user',
  }),
  items: many(quotationItems),
  exports: many(quotationExports),
  editLogs: many(quotationEditLogs),
}));

export const quotationEditLogsRelations = relations(quotationEditLogs, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationEditLogs.quotationId],
    references: [quotations.id],
  }),
  editedByUser: one(users, {
    fields: [quotationEditLogs.editedBy],
    references: [users.id],
    relationName: 'quotation_edit_edited_by_user',
  }),
}));

export const quotationExportsRelations = relations(quotationExports, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationExports.quotationId],
    references: [quotations.id],
  }),
  exportedByUser: one(users, {
    fields: [quotationExports.exportedBy],
    references: [users.id],
    relationName: 'quotation_export_exported_by_user',
  }),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipientUser: one(users, {
    fields: [notifications.recipientUserId],
    references: [users.id],
    relationName: 'notification_recipient_user',
  }),
  actorUser: one(users, {
    fields: [notifications.actorUserId],
    references: [users.id],
    relationName: 'notification_actor_user',
  }),
}));
