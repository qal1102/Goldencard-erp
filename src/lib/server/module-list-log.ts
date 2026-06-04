export function devModuleLog(module: string, message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${module}] ${message}`, extra ?? '');
  }
}

export function devModuleLogError(module: string, message: string, error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${module}] ${message}`, error);
  }
}

export const MODULE_LIST_ERROR =
  'Không thể tải dữ liệu. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.';
