import { buildFullAddress } from './format-address';

const GOOGLE_MAPS_SEARCH_BASE = 'https://www.google.com/maps/search/?api=1&query=';

/** Build a Google Maps search URL from address parts (no API key). */
export function buildGoogleMapsUrl(
  address?: string | null,
  province?: string | null,
): string | null {
  const full = buildFullAddress(address, province);
  if (!full) return null;
  return `${GOOGLE_MAPS_SEARCH_BASE}${encodeURIComponent(full)}`;
}
