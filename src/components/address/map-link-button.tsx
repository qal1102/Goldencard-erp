'use client';

import { MapPinIcon, NavigationIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildSurveyMapsUrl } from '@/lib/address/survey-location';

type Props = {
  address?: string | null;
  province?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  /** "Mở bản đồ" for general use; "Chỉ đường khảo sát" for survey detail */
  label?: string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'default';
  className?: string;
  /** Use navigation icon instead of map pin */
  direction?: boolean;
};

export function MapLinkButton({
  address,
  province,
  latitude,
  longitude,
  label = 'Mở bản đồ',
  variant = 'outline',
  size = 'sm',
  className,
  direction = false,
}: Props) {
  const url = buildSurveyMapsUrl({ latitude, longitude, address, province });
  if (!url) return null;

  const Icon = direction ? NavigationIcon : MapPinIcon;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      nativeButton={false}
      render={
        <a href={url} target="_blank" rel="noopener noreferrer" />
      }
    >
      <Icon className="size-3.5" />
      {label}
    </Button>
  );
}
