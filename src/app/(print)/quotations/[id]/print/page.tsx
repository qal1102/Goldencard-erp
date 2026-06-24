import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { QuotationPrintDocument } from '@/modules/quotations/components/quotation-print-document';
import { buildQuotationPrintModel } from '@/modules/quotations/lib/build-quotation-print-model';
import { queryQuotationForPrint } from '@/modules/quotations/lib/quotation-print.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Báo giá | GoldenCard ERP' };
}

export default async function QuotationPrintPage({ params }: Props) {
  const { id } = await params;

  const [session, quotation] = await Promise.all([auth(), queryQuotationForPrint(id)]);
  if (!quotation) notFound();

  const roles = session?.user?.roles ?? [];
  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant')) {
    notFound();
  }

  const model = buildQuotationPrintModel(quotation);

  return <QuotationPrintDocument model={model} quotationId={id} />;
}
