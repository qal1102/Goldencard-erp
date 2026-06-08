import 'server-only';

type ModulePerfExtra = Record<string, number | string | boolean | null | undefined>;

function slowLogThresholdMs(): number {
  const configured = Number(process.env.PERF_LOG_SLOW_MS ?? 1000);
  return Number.isFinite(configured) && configured >= 0 ? configured : 1000;
}

function shouldLogModulePerf(ms = 0): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.PERF_LOG === '1' ||
    process.env.MODULE_PERF_LOG === '1' ||
    ms >= slowLogThresholdMs()
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

export function modulePerfLog(
  module: string,
  step: string,
  ms = 0,
  extra?: ModulePerfExtra,
) {
  if (!shouldLogModulePerf(ms)) return;
  console.log(
    JSON.stringify({
      scope: 'module-perf',
      module,
      step,
      ms: Math.round(ms),
      ...extra,
    }),
  );
}

export function modulePerfLogError(module: string, step: string, error: unknown, ms = 0) {
  if (!shouldLogModulePerf(ms)) return;
  console.error(
    JSON.stringify({
      scope: 'module-perf',
      module,
      step,
      ms: Math.round(ms),
      error: errorMessage(error),
    }),
  );
}

export async function modulePerfTimed<T>(
  module: string,
  step: string,
  fn: () => Promise<T>,
  extra?: ModulePerfExtra,
): Promise<T> {
  const started = performance.now();
  try {
    return await fn();
  } finally {
    modulePerfLog(module, step, performance.now() - started, extra);
  }
}

export function devModuleLog(module: string, message: string, extra?: Record<string, unknown>) {
  const ms = typeof extra?.ms === 'number' ? extra.ms : 0;
  const count = typeof extra?.count === 'number' ? extra.count : undefined;
  modulePerfLog(module, message, ms, count === undefined ? undefined : { count });
}

export function devModuleLogError(module: string, message: string, error: unknown) {
  modulePerfLogError(module, message, error);
}

export const MODULE_LIST_ERROR =
  'Không thể tải dữ liệu. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.';
