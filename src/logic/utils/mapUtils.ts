/** Increments a key in a string-keyed numeric record (e.g. inventory). */
export function incrementRecordKey(
  record: Partial<Record<string, number>>,
  key: string,
  amount: number = 1
): number {
  const next = (record[key] ?? 0) + amount;
  record[key] = next;
  return next;
}

/** Adds an amount to a named numeric field on any state object (e.g. money). */
export function addToField<T extends object, K extends keyof T>(
  obj: T,
  field: T[K] extends number | undefined ? K : never,
  amount: number
): number {
  const current = (obj[field as K] as number | undefined) ?? 0;
  const next = current + amount;
  Object.assign(obj, { [field as string]: next });
  return next;
}
