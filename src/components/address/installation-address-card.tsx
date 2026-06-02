'use client';

import { MapPinIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { buildFullAddress, hasAddress } from '@/lib/address/format-address';
import { MapLinkButton } from './map-link-button';

type Props = {
  address?: string | null;
  province?: string | null;
  title?: string;
};

export function InstallationAddressCard({
  address,
  province,
  title = 'Địa chỉ lắp đặt dự án',
}: Props) {
  if (!hasAddress(address, province)) return null;

  const full = buildFullAddress(address, province);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <MapPinIcon className="size-3.5 shrink-0" />
          {title}
        </CardTitle>
        <MapLinkButton address={address} province={province} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <div className="flex flex-col gap-0.5">
          <Label className="text-xs text-muted-foreground">Địa chỉ</Label>
          <span className="text-sm">{address?.trim() || '—'}</span>
        </div>
        {province?.trim() && (
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs text-muted-foreground">Tỉnh / Thành phố</Label>
            <span className="text-sm">{province}</span>
          </div>
        )}
        {full && (
          <p className="text-xs text-muted-foreground">{full}</p>
        )}
      </CardContent>
    </Card>
  );
}
