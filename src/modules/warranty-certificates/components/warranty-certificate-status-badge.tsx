import { Badge } from '@/components/ui/badge';
import {
  WARRANTY_CERTIFICATE_STATUS_LABELS,
  type WarrantyCertificateStatus,
} from '../schema/warranty-certificate.schema';
import { resolveWarrantyCertificateStatus } from '../lib/warranty-certificate-status';

type Props = {
  status: string;
  warrantyEndAt?: Date | string | null;
};

export function WarrantyCertificateStatusBadge({ status, warrantyEndAt }: Props) {
  const effective = resolveWarrantyCertificateStatus({
    status,
    warrantyEndAt: warrantyEndAt ?? null,
  });
  const variant =
    effective === 'active' ? 'default' : effective === 'expired' ? 'secondary' : 'outline';

  return (
    <Badge variant={variant} className="text-[10px]">
      {WARRANTY_CERTIFICATE_STATUS_LABELS[effective as WarrantyCertificateStatus]}
    </Badge>
  );
}
