export type RouteMetric = {
  key: string;
  method: string;
  path: string;
  count: number;
  errors: number;
  avgMs: number;
  p95Ms: number;
  lastStatusCode: number;
};

type InternalRouteMetric = {
  method: string;
  path: string;
  count: number;
  errors: number;
  totalMs: number;
  durations: number[];
  lastStatusCode: number;
};

const MAX_DURATION_SAMPLES = 300;
const metricsStore = new Map<string, InternalRouteMetric>();
const startedAt = Date.now();

const percentile = (values: number[], q: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((q / 100) * sorted.length) - 1));
  return Number(sorted[idx].toFixed(2));
};

export const recordRequestMetric = (
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void => {
  const key = `${method} ${path}`;
  const existing = metricsStore.get(key);

  if (!existing) {
    metricsStore.set(key, {
      method,
      path,
      count: 1,
      errors: statusCode >= 500 ? 1 : 0,
      totalMs: durationMs,
      durations: [durationMs],
      lastStatusCode: statusCode,
    });
    return;
  }

  existing.count += 1;
  existing.errors += statusCode >= 500 ? 1 : 0;
  existing.totalMs += durationMs;
  existing.lastStatusCode = statusCode;
  existing.durations.push(durationMs);
  if (existing.durations.length > MAX_DURATION_SAMPLES) {
    existing.durations.shift();
  }
};

export const getMetricsSnapshot = (): {
  uptimeSec: number;
  routeCount: number;
  routes: RouteMetric[];
} => {
  const routes: RouteMetric[] = [...metricsStore.entries()].map(([key, item]) => ({
    key,
    method: item.method,
    path: item.path,
    count: item.count,
    errors: item.errors,
    avgMs: Number((item.totalMs / item.count).toFixed(2)),
    p95Ms: percentile(item.durations, 95),
    lastStatusCode: item.lastStatusCode,
  }));

  routes.sort((a, b) => b.count - a.count);

  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    routeCount: routes.length,
    routes,
  };
};
