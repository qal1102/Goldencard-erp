'use client';

import { ModuleRouteError } from '@/components/ui/module-route-error';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WarrantyCertificatesError(props: Props) {
  return (
    <ModuleRouteError title="Không thể tải trang phiếu bảo hành" {...props} />
  );
}
