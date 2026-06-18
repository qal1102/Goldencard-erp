import { relations } from 'drizzle-orm';
import { contracts } from './contracts';
import { handovers } from './handovers';
import { inventoryItems } from './inventory-items';
import { inventoryStockMovements } from './inventory-stock-movements';
import { inventoryStocks } from './inventory-stocks';
import { warrantyCertificates } from './warranty-certificates';
import { warrantyTickets } from './warranty-tickets';
import { warehouses } from './warehouses';
import { workOrders } from './work-orders';
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
  contracts: many(contracts, { relationName: 'contract_lead' }),
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
  contracts: many(contracts, { relationName: 'contract_customer' }),
  workOrders: many(workOrders, { relationName: 'work_order_customer' }),
  handovers: many(handovers, { relationName: 'handover_customer' }),
  warrantyTickets: many(warrantyTickets, { relationName: 'warranty_ticket_customer' }),
  warrantyCertificates: many(warrantyCertificates, {
    relationName: 'warranty_certificate_customer',
  }),
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
  contracts: many(contracts),
  workOrders: many(workOrders),
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
  contract: one(contracts, {
    fields: [quotations.id],
    references: [contracts.quotationId],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
    relationName: 'contract_customer',
  }),
  lead: one(leads, {
    fields: [contracts.leadId],
    references: [leads.id],
    relationName: 'contract_lead',
  }),
  survey: one(surveys, {
    fields: [contracts.surveyId],
    references: [surveys.id],
    relationName: 'contract_survey',
  }),
  quotation: one(quotations, {
    fields: [contracts.quotationId],
    references: [quotations.id],
    relationName: 'contract_quotation',
  }),
  createdByUser: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
    relationName: 'contract_created_by_user',
  }),
  signedByUser: one(users, {
    fields: [contracts.signedBy],
    references: [users.id],
    relationName: 'contract_signed_by_user',
  }),
  workOrder: one(workOrders, {
    fields: [contracts.id],
    references: [workOrders.contractId],
    relationName: 'contract_work_order',
  }),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [workOrders.customerId],
    references: [customers.id],
    relationName: 'work_order_customer',
  }),
  lead: one(leads, {
    fields: [workOrders.leadId],
    references: [leads.id],
    relationName: 'work_order_lead',
  }),
  survey: one(surveys, {
    fields: [workOrders.surveyId],
    references: [surveys.id],
    relationName: 'work_order_survey',
  }),
  quotation: one(quotations, {
    fields: [workOrders.quotationId],
    references: [quotations.id],
    relationName: 'work_order_quotation',
  }),
  contract: one(contracts, {
    fields: [workOrders.contractId],
    references: [contracts.id],
    relationName: 'work_order_contract',
  }),
  assignedUser: one(users, {
    fields: [workOrders.assignedTo],
    references: [users.id],
    relationName: 'work_order_assigned_user',
  }),
  createdByUser: one(users, {
    fields: [workOrders.createdBy],
    references: [users.id],
    relationName: 'work_order_created_by_user',
  }),
  completedByUser: one(users, {
    fields: [workOrders.completedBy],
    references: [users.id],
    relationName: 'work_order_completed_by_user',
  }),
  handover: one(handovers, {
    fields: [workOrders.id],
    references: [handovers.workOrderId],
    relationName: 'work_order_handover',
  }),
  stockMovements: many(inventoryStockMovements),
}));

export const handoversRelations = relations(handovers, ({ one, many }) => ({
  customer: one(customers, {
    fields: [handovers.customerId],
    references: [customers.id],
    relationName: 'handover_customer',
  }),
  lead: one(leads, {
    fields: [handovers.leadId],
    references: [leads.id],
    relationName: 'handover_lead',
  }),
  survey: one(surveys, {
    fields: [handovers.surveyId],
    references: [surveys.id],
    relationName: 'handover_survey',
  }),
  quotation: one(quotations, {
    fields: [handovers.quotationId],
    references: [quotations.id],
    relationName: 'handover_quotation',
  }),
  contract: one(contracts, {
    fields: [handovers.contractId],
    references: [contracts.id],
    relationName: 'handover_contract',
  }),
  workOrder: one(workOrders, {
    fields: [handovers.workOrderId],
    references: [workOrders.id],
    relationName: 'handover_work_order',
  }),
  handedOverByUser: one(users, {
    fields: [handovers.handedOverBy],
    references: [users.id],
    relationName: 'handover_handed_over_by_user',
  }),
  createdByUser: one(users, {
    fields: [handovers.createdBy],
    references: [users.id],
    relationName: 'handover_created_by_user',
  }),
  warrantyTickets: many(warrantyTickets, { relationName: 'warranty_ticket_handover' }),
  warrantyCertificate: one(warrantyCertificates, {
    fields: [handovers.id],
    references: [warrantyCertificates.handoverId],
    relationName: 'handover_warranty_certificate',
  }),
}));

export const warrantyCertificatesRelations = relations(warrantyCertificates, ({ one }) => ({
  customer: one(customers, {
    fields: [warrantyCertificates.customerId],
    references: [customers.id],
    relationName: 'warranty_certificate_customer',
  }),
  lead: one(leads, {
    fields: [warrantyCertificates.leadId],
    references: [leads.id],
    relationName: 'warranty_certificate_lead',
  }),
  survey: one(surveys, {
    fields: [warrantyCertificates.surveyId],
    references: [surveys.id],
    relationName: 'warranty_certificate_survey',
  }),
  quotation: one(quotations, {
    fields: [warrantyCertificates.quotationId],
    references: [quotations.id],
    relationName: 'warranty_certificate_quotation',
  }),
  contract: one(contracts, {
    fields: [warrantyCertificates.contractId],
    references: [contracts.id],
    relationName: 'warranty_certificate_contract',
  }),
  workOrder: one(workOrders, {
    fields: [warrantyCertificates.workOrderId],
    references: [workOrders.id],
    relationName: 'warranty_certificate_work_order',
  }),
  handover: one(handovers, {
    fields: [warrantyCertificates.handoverId],
    references: [handovers.id],
    relationName: 'warranty_certificate_handover',
  }),
  createdByUser: one(users, {
    fields: [warrantyCertificates.createdBy],
    references: [users.id],
    relationName: 'warranty_certificate_created_by_user',
  }),
}));

export const warrantyTicketsRelations = relations(warrantyTickets, ({ one }) => ({
  customer: one(customers, {
    fields: [warrantyTickets.customerId],
    references: [customers.id],
    relationName: 'warranty_ticket_customer',
  }),
  lead: one(leads, {
    fields: [warrantyTickets.leadId],
    references: [leads.id],
    relationName: 'warranty_ticket_lead',
  }),
  survey: one(surveys, {
    fields: [warrantyTickets.surveyId],
    references: [surveys.id],
    relationName: 'warranty_ticket_survey',
  }),
  quotation: one(quotations, {
    fields: [warrantyTickets.quotationId],
    references: [quotations.id],
    relationName: 'warranty_ticket_quotation',
  }),
  contract: one(contracts, {
    fields: [warrantyTickets.contractId],
    references: [contracts.id],
    relationName: 'warranty_ticket_contract',
  }),
  workOrder: one(workOrders, {
    fields: [warrantyTickets.workOrderId],
    references: [workOrders.id],
    relationName: 'warranty_ticket_work_order',
  }),
  handover: one(handovers, {
    fields: [warrantyTickets.handoverId],
    references: [handovers.id],
    relationName: 'warranty_ticket_handover',
  }),
  assignedUser: one(users, {
    fields: [warrantyTickets.assignedTo],
    references: [users.id],
    relationName: 'warranty_ticket_assigned_user',
  }),
  resolvedByUser: one(users, {
    fields: [warrantyTickets.resolvedBy],
    references: [users.id],
    relationName: 'warranty_ticket_resolved_by_user',
  }),
  cancelledByUser: one(users, {
    fields: [warrantyTickets.cancelledBy],
    references: [users.id],
    relationName: 'warranty_ticket_cancelled_by_user',
  }),
  createdByUser: one(users, {
    fields: [warrantyTickets.createdBy],
    references: [users.id],
    relationName: 'warranty_ticket_created_by_user',
  }),
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

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  stocks: many(inventoryStocks),
  stockMovements: many(inventoryStockMovements),
  createdByUser: one(users, {
    fields: [warehouses.createdBy],
    references: [users.id],
    relationName: 'warehouse_created_by_user',
  }),
  updatedByUser: one(users, {
    fields: [warehouses.updatedBy],
    references: [users.id],
    relationName: 'warehouse_updated_by_user',
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  stocks: many(inventoryStocks),
  stockMovements: many(inventoryStockMovements),
  createdByUser: one(users, {
    fields: [inventoryItems.createdBy],
    references: [users.id],
    relationName: 'inventory_item_created_by_user',
  }),
  updatedByUser: one(users, {
    fields: [inventoryItems.updatedBy],
    references: [users.id],
    relationName: 'inventory_item_updated_by_user',
  }),
}));

export const inventoryStocksRelations = relations(inventoryStocks, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [inventoryStocks.warehouseId],
    references: [warehouses.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryStocks.itemId],
    references: [inventoryItems.id],
  }),
  updatedByUser: one(users, {
    fields: [inventoryStocks.updatedBy],
    references: [users.id],
    relationName: 'inventory_stock_updated_by_user',
  }),
}));

export const inventoryStockMovementsRelations = relations(
  inventoryStockMovements,
  ({ one }) => ({
    warehouse: one(warehouses, {
      fields: [inventoryStockMovements.warehouseId],
      references: [warehouses.id],
    }),
    item: one(inventoryItems, {
      fields: [inventoryStockMovements.itemId],
      references: [inventoryItems.id],
    }),
    workOrder: one(workOrders, {
      fields: [inventoryStockMovements.workOrderId],
      references: [workOrders.id],
    }),
    createdByUser: one(users, {
      fields: [inventoryStockMovements.createdBy],
      references: [users.id],
      relationName: 'inventory_stock_movement_created_by_user',
    }),
  }),
);

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
