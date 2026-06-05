import 'server-only';

import { AsyncLocalStorage } from 'async_hooks';
import { perfLog } from './perf-log';

type RequestPerfStore = {
  route: string;
  startedAt: number;
  spans: Array<{ name: string; ms: number; ok: boolean; count?: number }>;
};

const storage = new AsyncLocalStorage<RequestPerfStore>();

export function runWithRequestPerf<T>(route: string, fn: () => T): T {
  const store: RequestPerfStore = { route, startedAt: performance.now(), spans: [] };
  return storage.run(store, fn);
}

export function getRequestPerfRoute(): string | undefined {
  return storage.getStore()?.route;
}

export function recordRequestSpan(name: string, ms: number, ok: boolean, count?: number): void {
  const store = storage.getStore();
  if (!store) return;
  store.spans.push({ name, ms: Math.round(ms * 10) / 10, ok, count });
}

export function flushRequestPerf(): void {
  const store = storage.getStore();
  if (!store) return;

  const totalMs = performance.now() - store.startedAt;
  const dbSpans = store.spans.filter((s) => s.name.startsWith('db:'));
  const authSpans = store.spans.filter((s) => s.name.startsWith('auth:'));

  perfLog({
    route: store.route,
    name: 'request:total',
    ms: totalMs,
    ok: store.spans.every((s) => s.ok),
    count: dbSpans.length,
  });

  if (authSpans.length > 0) {
    const authMs = authSpans.reduce((sum, s) => sum + s.ms, 0);
    perfLog({
      route: store.route,
      name: 'request:auth_total',
      ms: authMs,
      ok: true,
      count: authSpans.length,
    });
  }

  if (dbSpans.length > 0) {
    const slowest = dbSpans.reduce((a, b) => (b.ms > a.ms ? b : a));
    perfLog({
      route: store.route,
      name: 'request:db_slowest',
      ms: slowest.ms,
      ok: slowest.ok,
      count: dbSpans.length,
    });
    perfLog({
      route: store.route,
      name: `request:${slowest.name}`,
      ms: slowest.ms,
      ok: slowest.ok,
    });
  }
}
