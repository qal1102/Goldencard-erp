/** Public warranty check URL (safe for client and server). */
export function getPublicWarrantyCheckUrl(publicToken: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${base}/warranty/check/${publicToken}`;
}
