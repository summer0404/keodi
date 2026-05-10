import { getTTLForPurpose } from '../ttl-redis.helper';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';

describe('getTTLForPurpose', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 3 minutes (180 seconds) for forgot-password purpose', () => {
    expect(getTTLForPurpose(OtpPurpose.FORGOT_PASSWORD)).toBe(3 * 60);
  });

  it('returns 5 minutes (300 seconds) for reset-password purpose', () => {
    expect(getTTLForPurpose(OtpPurpose.RESET_PASSWORD)).toBe(5 * 60);
  });

  it('returns 1 hour (3600 seconds) for verify-email purpose', () => {
    expect(getTTLForPurpose(VerifyUrlPurpose.VERIFY_EMAIL)).toBe(60 * 60);
  });

  it('returns 1 hour (3600 seconds) as the default for an unknown purpose', () => {
    expect(getTTLForPurpose('unknown-purpose')).toBe(60 * 60);
  });

  it('uses exact enum string values — forgot-password and reset-password differ', () => {
    const forgotTtl = getTTLForPurpose('forgot-password');
    const resetTtl = getTTLForPurpose('reset-password');
    expect(forgotTtl).not.toBe(resetTtl);
    expect(forgotTtl).toBe(180);
    expect(resetTtl).toBe(300);
  });

  it('returns a positive number for every defined purpose', () => {
    [
      OtpPurpose.FORGOT_PASSWORD,
      OtpPurpose.RESET_PASSWORD,
      VerifyUrlPurpose.VERIFY_EMAIL,
    ].forEach((purpose) => {
      expect(getTTLForPurpose(purpose)).toBeGreaterThan(0);
    });
  });
});
