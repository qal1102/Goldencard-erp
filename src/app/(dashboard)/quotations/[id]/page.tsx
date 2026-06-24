import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryQuotationById } from '@/modules/quotations/lib/quotation.queries';
import { QuotationDetail } from '@/modules/quotations/components/quotation-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QuotationDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, quotation] = await Promise.all([auth(), queryQuotationById(id)]);
  if (!quotation) notFound();

  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'project_manager', 'chief_engineer', 'chief_accountant', 'accountant')) {
    notFound();
  }

  const canWrite = hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant');
  const canApprove = hasRole(roles, 'admin', 'director', 'chief_accountant');

  return (
    <div className="mx-auto w-full max-w-xl">
      <QuotationDetail
        quotationId={id}
        canWrite={canWrite}
        canApprove={canApprove}
      />
    </div>
  );
}
