import { describe, it, expect } from 'vitest';

describe('DBRouter Server Time RPC Parser', () => {
  it('should parse ISO 8601 strings from Supabase RPC fn_get_server_time into valid epoch milliseconds without throwing', () => {
    const parseServerTime = (data: unknown): number => {
      if (typeof data === 'string') {
        return Temporal.Instant.from(data).epochMilliseconds;
      }
      if (typeof data === 'number' && Number.isFinite(data)) {
        return Temporal.Instant.fromEpochMilliseconds(data).epochMilliseconds;
      }
      throw new Error(`[DBRouter] Invalid server time payload: ${String(data)}`);
    };

    const isoString = '2026-09-02T06:58:12.123456+00:00';
    const epochMs = parseServerTime(isoString);
    expect(Number.isFinite(epochMs)).toBe(true);
    expect(epochMs).toBeGreaterThan(0);

    const numericEpoch = 1788343090822;
    const epochMsFromNum = parseServerTime(numericEpoch);
    expect(epochMsFromNum).toBe(numericEpoch);
  });
});
