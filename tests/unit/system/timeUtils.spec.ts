import { describe, it, expect } from 'vitest';
import { formatDisplayDate, formatChatTimestamp } from '@/logic/utils/timeUtils';

describe('Time Utilities', () => {
  it('should format ISO dates to standard display format (GMT-3)', () => {
    // 2026-05-15T15:00:00Z -> should be 12:00 in GMT-3
    const isoDate = '2026-05-15T15:00:00Z';
    const formatted = formatDisplayDate(isoDate);
    
    // formatDisplayDate returns "DD/MM HH:mm"
    expect(formatted).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it('should handle SQLite datetime("now") format correctly', () => {
    // SQLite format: YYYY-MM-DD HH:MM:SS
    const sqliteDate = '2026-05-15 15:00:00';
    const formatted = formatDisplayDate(sqliteDate);
    expect(formatted).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it('should return --- for invalid dates', () => {
    expect(formatDisplayDate(null)).toBe('---');
    expect(formatDisplayDate(undefined)).toBe('---');
    expect(formatDisplayDate('')).toBe('---');
    expect(formatDisplayDate('invalid')).toBe('---');
  });

  describe('formatChatTimestamp', () => {
    // Reference "now" as 2026-08-30T14:48:00-03:00 (17:48:00 UTC)
    const nowZdt = Temporal.Instant.from('2026-08-30T17:48:00Z').toZonedDateTimeISO('America/Argentina/Buenos_Aires');

    it('should format today messages as HH:mm only', () => {
      // 14:46 on 2026-08-30 in GMT-3 (17:46 UTC)
      const todayIso = '2026-08-30T17:46:00Z';
      expect(formatChatTimestamp(todayIso, nowZdt)).toBe('14:46');

      // 03:10 on 2026-08-30 in GMT-3 (06:10 UTC)
      const earlierTodayIso = '2026-08-30T06:10:00Z';
      expect(formatChatTimestamp(earlierTodayIso, nowZdt)).toBe('03:10');
    });

    it('should format previous days as DD/MM/YYYY HH:mm', () => {
      // 21:52 on 2026-08-29 in GMT-3 (2026-08-30T00:52:00Z)
      const yesterdayIso = '2026-08-30T00:52:00Z';
      expect(formatChatTimestamp(yesterdayIso, nowZdt)).toBe('29/08/2026 21:52');

      // 15:00 on 2026-05-15 in GMT-3 (18:00 UTC)
      const monthsAgoIso = '2026-05-15T18:00:00Z';
      expect(formatChatTimestamp(monthsAgoIso, nowZdt)).toBe('15/05/2026 15:00');
    });

    it('should format previous years as DD/MM/YYYY HH:mm', () => {
      // 18:30 on 2025-12-25 in GMT-3 (21:30 UTC)
      const lastYearIso = '2025-12-25T21:30:00Z';
      expect(formatChatTimestamp(lastYearIso, nowZdt)).toBe('25/12/2025 18:30');
    });

    it('should handle epoch milliseconds for today and past days', () => {
      // Epoch for 2026-08-30T17:46:00Z (14:46 GMT-3)
      const epochToday = Temporal.Instant.from('2026-08-30T17:46:00Z').epochMilliseconds;
      expect(formatChatTimestamp(epochToday, nowZdt)).toBe('14:46');

      // Epoch for 2026-08-30T00:52:00Z (29/08 21:52 GMT-3)
      const epochYesterday = Temporal.Instant.from('2026-08-30T00:52:00Z').epochMilliseconds;
      expect(formatChatTimestamp(epochYesterday, nowZdt)).toBe('29/08/2026 21:52');
    });

    it('should handle SQLite timestamp strings without timezone (assumed UTC)', () => {
      // SQLite '2026-08-29 21:52:00' UTC -> 18:52 on 29/08 in GMT-3
      const sqliteDate = '2026-08-29 21:52:00';
      expect(formatChatTimestamp(sqliteDate, nowZdt)).toBe('29/08/2026 18:52');
    });

    it('should return empty string for empty or invalid inputs', () => {
      expect(formatChatTimestamp(null, nowZdt)).toBe('');
      expect(formatChatTimestamp(undefined, nowZdt)).toBe('');
      expect(formatChatTimestamp('', nowZdt)).toBe('');
      expect(formatChatTimestamp('invalid', nowZdt)).toBe('');
    });
  });
});

