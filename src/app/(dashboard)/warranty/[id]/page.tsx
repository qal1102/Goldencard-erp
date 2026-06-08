import { auth } from '@/auth';
import { AccessDeniedMessage } from '@/components/ui/access-denied-message';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyTicketDetail } from '@/modules/warranty-tickets/components/warranty-ticket-detail';

type Props = {
  params: Promise<{ id: string }>;
};

const WARRANTY_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

const WARRANTY_WRITE_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'customer_service',
] as const;

export default async function WarrantyDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, ...WARRANTY_VIEW_ROLES)) {
    return <AccessDeniedMessage moduleName="yêu cầu bảo hành" />;
  }

  const canWrite = hasRole(roles, ...WARRANTY_WRITE_ROLES);

  return <WarrantyTicketDetail ticketId={id} canWrite={canWrite} />;
}
