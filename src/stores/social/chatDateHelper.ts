/**
 * src/stores/social/chatDateHelper.ts
 *
 * Date parsing utilities for chat messages using Temporal.
 */
import { MIN_TIMESTAMP_DIGIT_LENGTH } from '@/logic/utils/timeUtils.ts';

export function parseInstantEpoch(val: string | number | undefined): number {
  if (!val) return 0;
  try {
    if (typeof val === 'number') return val;
    let isoStr = val.trim();
    const num = Number(isoStr);
    if (!isNaN(num) && isoStr.length > MIN_TIMESTAMP_DIGIT_LENGTH) return num;
    if (isoStr.includes(' ') && !isoStr.includes('T')) {
      isoStr = isoStr.replace(' ', 'T');
    }
    if (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.includes('-')) {
      isoStr += 'Z';
    }
    return Temporal.Instant.from(isoStr).epochMilliseconds;
  } catch {
    return 0;
  }
}
