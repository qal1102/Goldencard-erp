import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { WarrantyCertificateDetail } from '@/modules/warranty-certificates/components/warranty-certificate-detail';
import { generateWarrantyQrDataUrl } from '@/modules/warranty-certificates/lib/generate-warranty-qr-data-url';
import { loadWarrantyCertificateDetail } from '@/modules/warranty-certificates/lib/warranty-certificate-load';
import { getPublicWarrantyCheckUrl } from '@/modules/warranty-certificates/lib/public-url';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WarrantyCertificateDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await verifySession();
  const roles = session.user.roles ?? [];

  const loadResult = await loadWarrantyCertificateDetail(id, roles);
  if (!loadResult.success) notFound();

  const publicUrl = getPublicWarrantyCheckUrl(loadResult.data.publicToken);
  const qrDataUrl = await generateWarrantyQrDataUrl(publicUrl);

  return (
    <div className="mx-auto w-full max-w-xl">
      <WarrantyCertificateDetail
        certificateId={id}
        initialData={loadResult.data}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}
