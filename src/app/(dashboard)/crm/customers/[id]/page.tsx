import { notFound } from 'next/navigation';
import { CustomerDetail } from '@/modules/crm/components/customer-detail';
import { queryCustomerById } from '@/modules/crm/lib/customer.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const customer = await queryCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="mx-auto w-full max-w-xl">
      <CustomerDetail customerId={id} />
    </div>
  );
}
