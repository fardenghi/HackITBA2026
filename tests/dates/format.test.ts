import { describe, expect, it } from 'vitest';
import { formatDateTimeCompact } from '@/lib/dates/format';

describe('formatDateTimeCompact', () => {
  it('formats ISO timestamps as YYYY-MM-DD HH:MM', () => {
    expect(formatDateTimeCompact('2026-03-28T15:07:00.000Z')).toMatch(/^2026-03-28 \d{2}:07$/);
  });

  it('returns the original value when the timestamp is invalid', () => {
    expect(formatDateTimeCompact('invalid-date')).toBe('invalid-date');
  });
});
