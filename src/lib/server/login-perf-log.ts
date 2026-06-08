import 'server-only';

type LoginPerfExtra = Record<string, number | string | boolean | null | undefined>;

function slowLogThresholdMs(): number {
  const configured = Number(process.env.PERF_LOG_SLOW_MS ?? 1000);
  return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
}

function shouldLogLoginPerf(ms = 0): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.PERF_LOG === '1' ||
    ms >= slowLogThresholdMs()
  );
}

export function loginPerfLog(step: string, ms = 0, extra?: LoginPerfExtra) {
  if (!shouldLogLoginPerf(ms)) return;
  console.log(
    JSON.stringify({
      scope: 'login-perf',
      step,
      ms: Math.round(ms),
      ...extra,
    }),
  );
}

export function loginPerfLogError(step: string, error: unknown) {
  if (!shouldLogLoginPerf()) return;
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(JSON.stringify({ scope: 'login-perf', step, error: message }));
}

export async function loginPerfTimed<T>(
  step: string,
  fn: () => Promise<T>,
  extra?: LoginPerfExtra,
): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } finally {
    loginPerfLog(step, performance.now() - started, extra);
  }
}
