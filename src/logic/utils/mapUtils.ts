/**
 * Pure map / record increment helper.
 * Prevents duplicating `(record[key] || 0) + amount` across the codebase.
 */
export function incrementRecordKey<T extends string | number | symbol>(
  record: Record<T, number>,
  key: T,
  amount: number = 1
): number {
  const current = record[key] || 0;
  const next = current + amount;
  record[key] = next;
  return next;
}
