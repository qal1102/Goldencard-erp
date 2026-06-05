import { perfLog } from './perf-log';

export function devModuleLog(module: string, message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${module}] ${message}`, extra ?? '');
  }

  if (extra && typeof extra.ms === 'number') {
    perfLog({
      route: module,
      name: message,
      ms: extra.ms,
      ok: true,
      count: typeof extra.count === 'number' ? extra.count : undefined,
    });
  }
}

export function devModuleLogError(module: string, message: string, error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${module}] ${message}`, error);
  }
}

export const MODULE_LIST_ERROR =
  'Không thể tải dữ liệu. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.';
