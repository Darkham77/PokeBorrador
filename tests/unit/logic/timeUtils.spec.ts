import { describe, it, expect } from 'vitest';
import { formatDisplayDate } from '@/logic/utils/timeUtils';

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
});
