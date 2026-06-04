/** Deep-clone data for server action / RSC props; Dates become ISO strings. */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v)),
  ) as T;
}
