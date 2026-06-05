import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { generateWarrantyQrDataUrl } from '@/modules/warranty-certificates/lib/generate-warranty-qr-data-url';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyCertificatePrintDocument } from '@/modules/warranty-certificates/components/warranty-certificate-print-document';
import { buildWarrantyCertificatePrintModel } from '@/modules/warranty-certificates/lib/build-warranty-certificate-print-model';
import { queryWarrantyCertificateForPrint } from '@/modules/warranty-certificates/lib/warranty-certificate-print.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const certificate = await queryWarrantyCertificateForPrint(id);
  if (!certificate) {
    return { title: 'Phiếu bảo hành' };
  }
  return {
    title: `Phiếu bảo hành ${certificate.code} | GoldenCard ERP`,
  };
}

export default async function WarrantyCertificatePrintPage({ params }: Props) {
  const { id } = await params;

  const [session, certificate] = await Promise.all([
    auth(),
    queryWarrantyCertificateForPrint(id),
  ]);
  if (!certificate) notFound();

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
      'customer_service',
    )
  ) {
    notFound();
  }

  const model = buildWarrantyCertificatePrintModel(certificate);
  const qrDataUrl = await generateWarrantyQrDataUrl(model.publicCheckUrl);

  return (
    <WarrantyCertificatePrintDocument
      model={model}
      certificateId={id}
      qrDataUrl={qrDataUrl}
    />
  );
}
