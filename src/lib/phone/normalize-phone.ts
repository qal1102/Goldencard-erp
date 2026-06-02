function normalizeDigits(digits: string): string {
  if (digits.startsWith('84') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  // VN mobile often entered without leading 0 (9 digits starting with 9).
  if (digits.length === 9 && digits.startsWith('9')) {
    return `0${digits}`;
  }
  return digits;
}

/**
 * Normalize a phone number for comparison.
 * Strips non-digits and converts common VN international prefix (+84/84) to leading 0.
 */
export function normalizePhoneForComparison(phone: string): string {
  return normalizeDigits(phone.replace(/\D/g, ''));
}

/** Canonical form to store in the database. */
export function normalizePhoneForStorage(phone: string): string {
  return normalizePhoneForComparison(phone.trim());
}

/** Candidate stored forms to match against (exact DB lookup). */
export function phoneLookupVariants(phone: string): string[] {
  const trimmed = phone.trim();
  const normalized = normalizePhoneForComparison(trimmed);
  const variants = new Set<string>([trimmed, normalized]);

  if (normalized.startsWith('0') && normalized.length >= 10) {
    variants.add(`84${normalized.slice(1)}`);
  }

  return [...variants];
}
