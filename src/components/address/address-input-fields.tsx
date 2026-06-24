'use client';

import { useMemo, useState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildFullAddress } from '@/lib/address/format-address';

export const VIETNAM_PROVINCE_SUGGESTIONS = [
  { value: 'Hà Nội', aliases: ['ha noi', 'hn', 'tp ha noi', 'thanh pho ha noi'] },
  {
    value: 'Hồ Chí Minh',
    aliases: ['ho chi minh', 'hcm', 'tphcm', 'tp hcm', 'sai gon', 'saigon', 'tp ho chi minh'],
  },
  { value: 'Hải Phòng', aliases: ['hai phong', 'hp', 'tp hai phong'] },
  { value: 'Đà Nẵng', aliases: ['da nang', 'dn', 'tp da nang'] },
  { value: 'Cần Thơ', aliases: ['can tho', 'ct', 'tp can tho'] },
  { value: 'Huế', aliases: ['hue', 'tp hue', 'thua thien hue'] },
  { value: 'Lai Châu', aliases: ['lai chau'] },
  { value: 'Điện Biên', aliases: ['dien bien'] },
  { value: 'Sơn La', aliases: ['son la'] },
  { value: 'Lạng Sơn', aliases: ['lang son'] },
  { value: 'Quảng Ninh', aliases: ['quang ninh'] },
  { value: 'Cao Bằng', aliases: ['cao bang'] },
  { value: 'Tuyên Quang', aliases: ['tuyen quang'] },
  { value: 'Lào Cai', aliases: ['lao cai'] },
  { value: 'Thái Nguyên', aliases: ['thai nguyen'] },
  { value: 'Phú Thọ', aliases: ['phu tho'] },
  { value: 'Bắc Ninh', aliases: ['bac ninh'] },
  { value: 'Hưng Yên', aliases: ['hung yen'] },
  { value: 'Ninh Bình', aliases: ['ninh binh'] },
  { value: 'Thanh Hóa', aliases: ['thanh hoa'] },
  { value: 'Nghệ An', aliases: ['nghe an'] },
  { value: 'Hà Tĩnh', aliases: ['ha tinh'] },
  { value: 'Quảng Trị', aliases: ['quang tri'] },
  { value: 'Quảng Ngãi', aliases: ['quang ngai'] },
  { value: 'Gia Lai', aliases: ['gia lai'] },
  { value: 'Đắk Lắk', aliases: ['dak lak', 'daklak', 'buon ma thuot'] },
  { value: 'Khánh Hòa', aliases: ['khanh hoa', 'nha trang'] },
  { value: 'Lâm Đồng', aliases: ['lam dong', 'da lat'] },
  { value: 'Đồng Nai', aliases: ['dong nai', 'bien hoa'] },
  { value: 'Tây Ninh', aliases: ['tay ninh'] },
  { value: 'Đồng Tháp', aliases: ['dong thap'] },
  { value: 'An Giang', aliases: ['an giang'] },
  { value: 'Vĩnh Long', aliases: ['vinh long'] },
  { value: 'Cà Mau', aliases: ['ca mau'] },
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

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
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
  const [provinceFocused, setProvinceFocused] = useState(false);
  const addressListId = `${idPrefix}-address-hints`;
  const canOpenMap = Boolean((address || province).trim());
  const provinceQuery = normalizeSearch(province);
  const provinceSuggestions = useMemo(() => {
    if (!provinceQuery) return VIETNAM_PROVINCE_SUGGESTIONS.slice(0, 8);
    return VIETNAM_PROVINCE_SUGGESTIONS.filter((item) => {
      const value = normalizeSearch(item.value);
      return (
        value.includes(provinceQuery) ||
        item.aliases.some((alias) => normalizeSearch(alias).includes(provinceQuery))
      );
    }).slice(0, 8);
  }, [provinceQuery]);
  const showProvinceSuggestions =
    provinceFocused && !disabled && provinceSuggestions.length > 0;

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
          <div className="relative">
            <Input
              id={`${idPrefix}-province`}
              value={province}
              onChange={(event) => onProvinceChange(event.target.value)}
              onFocus={() => setProvinceFocused(true)}
              onBlur={() => setProvinceFocused(false)}
              placeholder="Gõ HN, HCM, TP, Đà Nẵng..."
              disabled={disabled}
              autoComplete="off"
            />
            {showProvinceSuggestions && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                {provinceSuggestions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="flex min-h-9 w-full items-center rounded-md px-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onProvinceChange(item.value);
                      setProvinceFocused(false);
                    }}
                  >
                    {item.value}
                  </button>
                ))}
              </div>
            )}
          </div>
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
