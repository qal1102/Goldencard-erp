import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { WarrantyCertificatePrintDocument } from '@/modules/warranty-certificates/components/warranty-certificate-print-document';
import { buildWarrantyCertificatePrintModel } from '@/modules/warranty-certificates/lib/build-warranty-certificate-print-model';
import { queryWarrantyCertificateForPrint } from '@/modules/warranty-certificates/lib/warranty-certificate-print.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Phiếu bảo hành | GoldenCard ERP' };
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
  const qrDataUrl = await QRCode.toDataURL(model.publicCheckUrl, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return (
    <WarrantyCertificatePrintDocument
      model={model}
      certificateId={id}
      qrDataUrl={qrDataUrl}
    />
  );
}
