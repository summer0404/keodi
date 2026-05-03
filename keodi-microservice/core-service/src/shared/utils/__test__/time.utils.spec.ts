import { formatTimeOnly } from '../time.utils';

describe('formatTimeOnly', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns HH:MM:SS for midnight (00:00:00 UTC)', () => {
    const date = new Date('1970-01-01T00:00:00.000Z');
    expect(formatTimeOnly(date)).toBe('00:00:00');
  });

  it('returns HH:MM:SS for noon (12:00:00 UTC)', () => {
    const date = new Date('1970-01-01T12:00:00.000Z');
    expect(formatTimeOnly(date)).toBe('12:00:00');
  });

  it('pads single-digit hours, minutes, seconds with leading zeros', () => {
    const date = new Date('1970-01-01T09:05:03.000Z');
    expect(formatTimeOnly(date)).toBe('09:05:03');
  });

  it('returns HH:MM:SS for end-of-day (23:59:59 UTC)', () => {
    const date = new Date('1970-01-01T23:59:59.000Z');
    expect(formatTimeOnly(date)).toBe('23:59:59');
  });

  it('returns the UTC portion regardless of local timezone offset', () => {
    // Create a date with a known UTC time
    const date = new Date(Date.UTC(2024, 0, 15, 14, 30, 45));
    expect(formatTimeOnly(date)).toBe('14:30:45');
  });

  it('handles an ISO string datetime correctly', () => {
    const date = new Date('2026-05-01T08:15:00.000Z');
    expect(formatTimeOnly(date)).toBe('08:15:00');
  });
});
