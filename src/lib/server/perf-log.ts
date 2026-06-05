import 'server-only';

export type PerfLogEntry = {
  route?: string;
  name: string;
  ms: number;
  ok: boolean;
  /** Optional count, e.g. rows returned or query count */
  count?: number;
  error?: string;
};

const PERF_ENABLED =
  process.env.PERF_LOG === '1' ||
  process.env.NODE_ENV === 'development' ||
  process.env.VERCEL_ENV === 'preview';

/** Lightweight server perf log — no secrets, no connection strings. */
export function perfLog(entry: PerfLogEntry): void {
  if (!PERF_ENABLED) return;

  const payload: Record<string, unknown> = {
    perf: true,
    name: entry.name,
    ms: Math.round(entry.ms * 10) / 10,
    ok: entry.ok,
  };
  if (entry.route) payload.route = entry.route;
  if (entry.count !== undefined) payload.count = entry.count;
  if (entry.error) payload.error = entry.error;

  const line = JSON.stringify(payload);
  if (entry.ok) {
    console.log(line);
  } else {
    console.warn(line);
  }
}

export async function perfTimed<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { route?: string; count?: (result: T) => number },
): Promise<T> {
  const started = performance.now();
  try {
    const result = await fn();
    perfLog({
      route: options?.route,
      name,
      ms: performance.now() - started,
      ok: true,
      count: options?.count?.(result),
    });
    return result;
  } catch (error) {
    perfLog({
      route: options?.route,
      name,
      ms: performance.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }
}
