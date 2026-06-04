import { GOLDENCARD_COMPANY_PROFILE } from '@/lib/documents/company-profile';

/** Canonical warranty / CSKH hotline (digits only for comparison). */
export const WARRANTY_SUPPORT_HOTLINE = '0333314288';

const LEGACY_HOTLINE_DIGITS = new Set(['0903117277']);

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Effective hotline for display, print, and public pages. */
export function resolveSupportPhone(stored: string | null | undefined): string {
  const trimmed = stored?.trim();
  if (trimmed) {
    const digits = digitsOnly(trimmed);
    if (!LEGACY_HOTLINE_DIGITS.has(digits)) {
      return trimmed;
    }
  }
  return GOLDENCARD_COMPANY_PROFILE.hotline;
}
