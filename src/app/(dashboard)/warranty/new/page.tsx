import { notFound } from 'next/navigation';
import { ReplaceLink } from '@/components/navigation/replace-link';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryCustomerById } from '@/modules/crm/lib/customer.queries';
import { queryHandoverById } from '@/modules/handovers/lib/handover.queries';
import { WarrantyTicketDirectCreate } from '@/modules/warranty-tickets/components/warranty-ticket-direct-create';
import {
  WarrantyTicketCreateForm,
  type WarrantyTicketCreatePrefill,
} from '@/modules/warranty-tickets/components/warranty-ticket-create-form';
import { queryWarrantyCustomerOptions } from '@/modules/warranty-tickets/lib/warranty-ticket-create-options';

type Props = {
  searchParams: Promise<{ handoverId?: string; customerId?: string }>;
};

const WARRANTY_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'customer_service',
] as const;

export default async function NewWarrantyTicketPage({ searchParams }: Props) {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, ...WARRANTY_WRITE_ROLES)) {
    notFound();
  }

  const { handoverId, customerId } = await searchParams;

  let prefill: WarrantyTicketCreatePrefill | null = null;
  let cancelHref = '/warranty';

  if (handoverId) {
    const handover = await queryHandoverById(handoverId);
    if (!handover || handover.status !== 'completed') notFound();

    prefill = {
      customerId: handover.customerId,
      customerLabel: handover.customer?.fullName,
      leadId: handover.leadId,
      surveyId: handover.surveyId,
      quotationId: handover.quotationId,
      contractId: handover.contractId,
      workOrderId: handover.workOrderId,
      handoverId: handover.id,
      customerContactName: handover.customerReceiverName ?? handover.customer?.fullName ?? null,
      customerContactPhone: handover.customer?.phone ?? null,
    };
    cancelHref = `/handovers/${handoverId}`;
  } else if (customerId) {
    const customer = await queryCustomerById(customerId);
    if (!customer) notFound();

    prefill = {
      customerId: customer.id,
      customerLabel: customer.fullName,
      customerContactName: customer.fullName,
      customerContactPhone: customer.phone,
    };
    cancelHref = `/crm/customers/${customerId}`;
  } else {
    const customers = await queryWarrantyCustomerOptions();

    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4">
          <ReplaceLink href="/warranty" className="text-xs text-primary hover:underline">
            ← Quay lại danh sách
          </ReplaceLink>
          <h1 className="mt-2 text-base font-semibold">Tạo yêu cầu bảo hành/CSKH</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dùng khi khách hàng liên hệ trực tiếp và cần lập phiếu xử lý mới.
          </p>
        </div>
        <WarrantyTicketDirectCreate customers={customers} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <ReplaceLink href={cancelHref} className="text-xs text-primary hover:underline">
          ← Quay lại
        </ReplaceLink>
        <h1 className="mt-2 text-base font-semibold">Tạo yêu cầu bảo hành/CSKH</h1>
      </div>
      <WarrantyTicketCreateForm prefill={prefill} cancelHref={cancelHref} />
    </div>
  );
}
