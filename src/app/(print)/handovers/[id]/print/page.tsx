import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { HandoverPrintDocument } from '@/modules/handovers/components/handover-print-document';
import { buildHandoverPrintModel } from '@/modules/handovers/lib/build-handover-print-model';
import { queryHandoverForPrint } from '@/modules/handovers/lib/handover-print.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Biên bản bàn giao | GoldenCard ERP' };
}

export default async function HandoverPrintPage({ params }: Props) {
  const { id } = await params;

  const [session, handover] = await Promise.all([auth(), queryHandoverForPrint(id)]);
  if (!handover) notFound();

  const roles = session?.user?.roles ?? [];
  if (
    !hasRole(
      roles,
      'admin',
      'director',
      'sales',
      'chief_accountant',
      'accountant',
      'technician',
    )
  ) {
    notFound();
  }

  const model = buildHandoverPrintModel(handover);

  return <HandoverPrintDocument model={model} handoverId={id} />;
}
