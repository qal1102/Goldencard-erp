import { buildGoogleMapsUrl } from './maps-url';

const GOOGLE_MAPS_SEARCH_BASE = 'https://www.google.com/maps/search/?api=1&query=';

export type SurveyCheckInCoords = {
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function hasPinnedCheckIn(coords: SurveyCheckInCoords): boolean {
  return parseCoordinate(coords.latitude) != null && parseCoordinate(coords.longitude) != null;
}

export function formatCoordinatePair(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): string | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Prefer pinned GPS; fall back to typed address search URL. */
export function buildSurveyMapsUrl(options: {
  latitude?: string | number | null;
  longitude?: string | number | null;
  address?: string | null;
  province?: string | null;
}): string | null {
  const lat = parseCoordinate(options.latitude);
  const lng = parseCoordinate(options.longitude);
  if (lat != null && lng != null) {
    return `${GOOGLE_MAPS_SEARCH_BASE}${lat},${lng}`;
  }
  return buildGoogleMapsUrl(options.address, options.province);
}

export function formatAccuracyMeters(
  accuracy: string | number | null | undefined,
): string | null {
  const n = parseCoordinate(accuracy);
  if (n == null) return null;
  return `±${Math.round(n)} m`;
}
