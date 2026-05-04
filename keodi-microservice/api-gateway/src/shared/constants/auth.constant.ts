const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const CookieMaxAge = {
  REMEMBER_ME: 365 * DAY,
  DEFAULT: 7 * DAY,
} as const;
