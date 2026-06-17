import os from "node:os";

/**
 * Run `fn` over `items` with at most `concurrency` tasks in flight.
 * Results preserve input order.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Default parallel workers: min(4, CPU count). */
export function defaultWorkers(override?: number): number {
  if (override !== undefined && override > 0) return override;
  return Math.min(4, Math.max(1, os.cpus().length));
}
