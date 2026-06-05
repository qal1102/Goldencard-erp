function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }
  return 'http://localhost:3000';
}

/** Public warranty check URL (safe for client and server). */
export function getPublicWarrantyCheckUrl(publicToken: string): string {
  return `${getAppBaseUrl()}/warranty/check/${publicToken}`;
}
