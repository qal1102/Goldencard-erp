import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyCertificateDetail } from '@/modules/warranty-certificates/components/warranty-certificate-detail';
import { queryWarrantyCertificateById } from '@/modules/warranty-certificates/lib/warranty-certificate.queries';

type Props = {
  params: Promise<{ id: string }>;
};

const CERT_VIEW_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
  'accountant',
  'technician',
  'customer_service',
] as const;

export default async function WarrantyCertificateDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, certificate] = await Promise.all([auth(), queryWarrantyCertificateById(id)]);
  if (!certificate) notFound();

  const roles = session?.user?.roles ?? [];
  if (!hasRole(roles, ...CERT_VIEW_ROLES)) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <WarrantyCertificateDetail certificateId={id} />
    </div>
  );
}
