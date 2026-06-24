'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildFullAddress } from '@/lib/address/format-address';

export const VIETNAM_PROVINCE_SUGGESTIONS = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'Lai Châu',
  'Điện Biên',
  'Sơn La',
  'Lạng Sơn',
  'Quảng Ninh',
  'Cao Bằng',
  'Tuyên Quang',
  'Lào Cai',
  'Thái Nguyên',
  'Phú Thọ',
  'Bắc Ninh',
  'Hưng Yên',
  'Ninh Bình',
  'Thanh Hóa',
  'Nghệ An',
  'Hà Tĩnh',
  'Quảng Trị',
  'Quảng Ngãi',
  'Gia Lai',
  'Đắk Lắk',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đồng Nai',
  'Tây Ninh',
  'Đồng Tháp',
  'An Giang',
  'Vĩnh Long',
  'Cà Mau',
] as const;

type AddressInputFieldsProps = {
  idPrefix: string;
  address: string;
  province: string;
  onAddressChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  addressLabel?: string;
  provinceLabel?: string;
  required?: boolean;
  disabled?: boolean;
  addressError?: string;
  addressPlaceholder?: string;
};

function openMapsSearch(address: string, province: string) {
  const query = buildFullAddress(address, province) || address || province;
  if (!query.trim()) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

export function AddressInputFields({
  idPrefix,
  address,
  province,
  onAddressChange,
  onProvinceChange,
  addressLabel = 'Địa chỉ',
  provinceLabel = 'Tỉnh / Thành phố',
  required = false,
  disabled = false,
  addressError,
  addressPlaceholder = 'Số nhà, đường, phường/xã, quận/huyện cũ nếu có...',
}: AddressInputFieldsProps) {
  const provinceListId = `${idPrefix}-province-suggestions`;
  const addressListId = `${idPrefix}-address-hints`;
  const canOpenMap = Boolean((address || province).trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-address`}>
          {addressLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id={`${idPrefix}-address`}
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder={addressPlaceholder}
          list={addressListId}
          disabled={disabled}
          aria-invalid={Boolean(addressError)}
        />
        <datalist id={addressListId}>
          <option value="Số nhà, tên đường, phường/xã, tỉnh/thành phố" />
          <option value="Tên công ty/dự án, phường/xã, tỉnh/thành phố" />
          <option value="Gần mốc địa điểm, đường, phường/xã, tỉnh/thành phố" />
        </datalist>
        {addressError && <p className="text-xs text-destructive">{addressError}</p>}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-province`}>{provinceLabel}</Label>
          <Input
            id={`${idPrefix}-province`}
            value={province}
            onChange={(event) => onProvinceChange(event.target.value)}
            placeholder="Chọn/gõ tỉnh thành theo địa giới mới"
            list={provinceListId}
            disabled={disabled}
          />
          <datalist id={provinceListId}>
            {VIETNAM_PROVINCE_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-10"
          disabled={!canOpenMap || disabled}
          onClick={() => openMapsSearch(address, province)}
        >
          <ExternalLinkIcon className="size-4" />
          Kiểm tra Maps
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Có thể gõ quận/huyện cũ trong dòng địa chỉ. Hệ thống sẽ ghép địa chỉ để Google Maps tìm
        nhanh hơn.
      </p>
    </div>
  );
}
