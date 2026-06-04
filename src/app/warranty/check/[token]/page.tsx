import { notFound } from 'next/navigation';
import { PublicWarrantyCheck } from '@/modules/warranty-certificates/components/public-warranty-check';
import { getPublicWarrantyCheckAction } from '@/modules/warranty-certificates/actions/public-warranty.actions';

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: 'Tra cứu bảo hành | GoldenCard',
  description: 'Tra cứu thông tin bảo hành hệ thống điện mặt trời GoldenCard',
};

export default async function PublicWarrantyCheckPage({ params }: Props) {
  const { token } = await params;

  const result = await getPublicWarrantyCheckAction(token);
  if (!result.success) {
    notFound();
  }

  return <PublicWarrantyCheck publicToken={token} initialView={result.data} />;
}
