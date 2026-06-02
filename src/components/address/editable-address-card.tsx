'use client';

import { MapPinIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { buildFullAddress, hasAddress } from '@/lib/address/format-address';
import { EditAddressDialog } from './edit-address-dialog';
import { MapLinkButton } from './map-link-button';

type Props = {
  title: string;
  addressFieldLabel: string;
  address?: string | null;
  province?: string | null;
  canEdit?: boolean;
  requireEditNote?: boolean;
  quotationWarning?: boolean;
  isPending?: boolean;
  onSave: (data: { address: string; province?: string; editNote?: string }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  mapLabel?: string;
  mapDirection?: boolean;
  /** Show card even when address is empty (for adding address) */
  showWhenEmpty?: boolean;
};

export function EditableAddressCard({
  title,
  addressFieldLabel,
  address,
  province,
  canEdit = false,
  requireEditNote = false,
  quotationWarning = false,
  isPending = false,
  onSave,
  mapLabel,
  mapDirection = false,
  showWhenEmpty = false,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const hasContent = hasAddress(address, province);

  if (!hasContent && !showWhenEmpty && !canEdit) return null;

  const full = buildFullAddress(address, province);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <MapPinIcon className="size-3.5 shrink-0" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasContent && (
              <MapLinkButton
                address={address}
                province={province}
                label={mapLabel}
                direction={mapDirection}
              />
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-3.5" />
                Sửa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          {hasContent ? (
            <>
              <div className="flex flex-col gap-0.5">
                <Label className="text-xs text-muted-foreground">{addressFieldLabel}</Label>
                <span className="text-sm">{address?.trim() || '—'}</span>
              </div>
              {province?.trim() && (
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs text-muted-foreground">Tỉnh / Thành phố</Label>
                  <span className="text-sm">{province}</span>
                </div>
              )}
              {full && <p className="text-xs text-muted-foreground">{full}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Chưa có địa chỉ — bấm Sửa để thêm.</p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <EditAddressDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title={`Sửa ${title.toLowerCase()}`}
          addressFieldLabel={addressFieldLabel}
          address={address?.trim() ?? ''}
          province={province}
          requireEditNote={requireEditNote}
          quotationWarning={quotationWarning}
          isPending={isPending}
          onSubmit={onSave}
        />
      )}
    </>
  );
}
