import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { ContractPrintDocument } from '@/modules/contracts/components/contract-print-document';
import { buildContractPrintModel } from '@/modules/contracts/lib/build-contract-print-model';
import { queryContractForPrint } from '@/modules/contracts/lib/contract-print.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const contract = await queryContractForPrint(id);
  if (!contract) {
    return { title: 'Hợp đồng thi công' };
  }
  return {
    title: `Hợp đồng ${contract.code} | GoldenCard ERP`,
  };
}

export default async function ContractPrintPage({ params }: Props) {
  const { id } = await params;

  const [session, contract] = await Promise.all([auth(), queryContractForPrint(id)]);
  if (!contract) notFound();

  const roles = session?.user?.roles ?? [];
  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant', 'accountant')) {
    notFound();
  }

  const model = buildContractPrintModel(contract);

  return <ContractPrintDocument model={model} contractId={id} />;
}
