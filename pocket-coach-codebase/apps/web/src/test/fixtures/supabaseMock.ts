import { vi } from 'vitest';

interface QueryResult {
  data?: unknown;
  error?: unknown;
}

/**
 * A fake Supabase query builder. Every chain method returns the builder itself, and awaiting it
 * (or calling `.single()` / `.maybeSingle()` and awaiting) resolves to `{ data, error }`.
 */
export function query(result: QueryResult = {}) {
  const q: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gte',
    'lte',
    'in',
    'order',
    'single',
    'maybeSingle',
  ];
  for (const m of methods) q[m] = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
  return q as Record<string, ReturnType<typeof vi.fn>> & { then: unknown };
}

type Route = ReturnType<typeof query> | ReturnType<typeof query>[];

/**
 * Routes `supabase.from(table)` to prepared query builders. A list is consumed in order (the last
 * entry repeats), which lets one table answer several different queries in a test.
 */
export function routeFrom(routes: Record<string, Route>) {
  const counters: Record<string, number> = {};
  return (table: string) => {
    const route = routes[table];
    if (!route) return query();
    if (!Array.isArray(route)) return route;
    const i = Math.min(counters[table] ?? 0, route.length - 1);
    counters[table] = (counters[table] ?? 0) + 1;
    return route[i];
  };
}
