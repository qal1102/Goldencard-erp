/** Build a single-line address string for display and map search. */
export function buildFullAddress(
  address?: string | null,
  province?: string | null,
): string {
  const parts = [address?.trim(), province?.trim()].filter(Boolean);
  return parts.join(', ');
}

/** Compare two address pairs (case-insensitive, trimmed). */
export function addressesAreSame(
  a: { address?: string | null; province?: string | null },
  b: { address?: string | null; province?: string | null },
): boolean {
  const norm = (v?: string | null) => (v?.trim().toLowerCase() ?? '');
  return norm(a.address) === norm(b.address) && norm(a.province) === norm(b.province);
}

export function hasAddress(address?: string | null, province?: string | null): boolean {
  return Boolean(address?.trim() || province?.trim());
}
