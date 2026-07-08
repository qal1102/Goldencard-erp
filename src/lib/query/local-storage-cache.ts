'use client';

const CACHE_PREFIX = 'goldencard.query-cache.';

export function readLocalQueryCache<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { data?: T };
    return parsed.data;
  } catch {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return undefined;
  }
}

export function writeLocalQueryCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ data, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Local cache is best-effort only. Server data remains the source of truth.
  }
}
