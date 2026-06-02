import { browser, dev } from "$app/environment";

export interface PerformanceMeasure {
  name: string;
  duration: number;
  startedAt: number;
  metadata?: Record<string, string | number | boolean | undefined>;
}

const MAX_MEASURES = 100;
const measures: PerformanceMeasure[] = [];

function canMeasure(): boolean {
  if (!browser || typeof performance === "undefined") return false;
  if (dev) return true;
  try {
    return localStorage.getItem("tamarix:perf") === "1";
  } catch {
    return false;
  }
}

function recordMeasure(measure: PerformanceMeasure) {
  measures.unshift(measure);
  if (measures.length > MAX_MEASURES) {
    measures.length = MAX_MEASURES;
  }
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: PerformanceMeasure["metadata"]
): T {
  if (!canMeasure()) return fn();

  const startedAt = performance.now();
  try {
    return fn();
  } finally {
    recordMeasure({
      name,
      duration: performance.now() - startedAt,
      startedAt,
      metadata
    });
  }
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: PerformanceMeasure["metadata"]
): Promise<T> {
  if (!canMeasure()) return fn();

  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    recordMeasure({
      name,
      duration: performance.now() - startedAt,
      startedAt,
      metadata
    });
  }
}

export function getRecentPerformanceMeasures(): PerformanceMeasure[] {
  return [...measures];
}
