-- GoldenCard ERP production demo-data reset.
--
-- Purpose:
--   Remove demo/business records so the team can start entering real operating data.
--
-- Preserved on purpose:
--   users
--   roles
--   user_roles
--   permissions
--   role_permissions
--
-- Important:
--   Run only after a fresh production backup/export.
--   This script is destructive. Review docs/04-production-demo-data-reset.md first.

BEGIN;

-- Ephemeral/system activity linked to demo records.
DELETE FROM public.notifications;
DELETE FROM public.audit_logs;

-- Inventory transactional data, then inventory master data.
DELETE FROM public.inventory_stock_movements;
DELETE FROM public.inventory_stocks;

-- Warranty/service.
DELETE FROM public.warranty_tickets;
DELETE FROM public.warranty_certificates;

-- Delivery and execution workflow.
DELETE FROM public.handovers;
DELETE FROM public.work_orders;
DELETE FROM public.contracts;

-- Quotations and quotation child tables.
DELETE FROM public.quotation_exports;
DELETE FROM public.quotation_edit_logs;
DELETE FROM public.quotation_items;
DELETE FROM public.quotations;

-- Surveys and survey child tables.
DELETE FROM public.survey_edit_logs;
DELETE FROM public.survey_zones;
DELETE FROM public.surveys;

-- CRM.
DELETE FROM public.lead_activities;
DELETE FROM public.customers;
DELETE FROM public.leads;

-- Inventory master data.
DELETE FROM public.inventory_items;
DELETE FROM public.warehouses;

-- Reset business code sequences so real data starts cleanly.
ALTER SEQUENCE public.lead_code_seq RESTART WITH 1;
ALTER SEQUENCE public.customer_code_seq RESTART WITH 1;
ALTER SEQUENCE public.survey_code_seq RESTART WITH 1;
ALTER SEQUENCE public.quotation_code_seq RESTART WITH 1;
ALTER SEQUENCE public.contract_code_seq RESTART WITH 1;
ALTER SEQUENCE public.work_order_code_seq RESTART WITH 1;
ALTER SEQUENCE public.handover_code_seq RESTART WITH 1;
ALTER SEQUENCE public.warranty_ticket_code_seq RESTART WITH 1;
ALTER SEQUENCE public.warranty_certificate_code_seq RESTART WITH 1;
ALTER SEQUENCE public.audit_logs_id_seq RESTART WITH 1;

COMMIT;

