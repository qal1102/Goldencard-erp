'use client';

const CACHE_PREFIX = 'goldencard.query-cache.';
const DEFAULT_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type CacheEntry<T> = {
  data?: T;
  savedAt?: string;
};

function isFresh(savedAt: string | undefined, maxAgeMs: number) {
  if (!savedAt) return false;
  const savedAtMs = new Date(savedAt).getTime();
  if (!Number.isFinite(savedAtMs)) return false;
  return Date.now() - savedAtMs <= maxAgeMs;
}

export function readLocalQueryCache<T>(
  key: string,
  options: { maxAgeMs?: number } = {},
): T | undefined {
  if (typeof window === 'undefined') return undefined;

  const storageKey = `${CACHE_PREFIX}${key}`;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!isFresh(parsed.savedAt, maxAgeMs)) {
      window.localStorage.removeItem(storageKey);
      return undefined;
    }
    return parsed.data;
  } catch {
    window.localStorage.removeItem(storageKey);
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
