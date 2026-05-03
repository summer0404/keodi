import { timeLimitResend } from '../time-limit-resend';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';

describe('timeLimitResend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 2 minutes (120 seconds) for forgot-password', () => {
    expect(timeLimitResend(OtpPurpose.FORGOT_PASSWORD)).toBe(2 * 60);
  });

  it('returns 3 minutes (180 seconds) for reset-password', () => {
    expect(timeLimitResend(OtpPurpose.RESET_PASSWORD)).toBe(3 * 60);
  });

  it('returns 5 minutes (300 seconds) for verify-email', () => {
    expect(timeLimitResend(VerifyUrlPurpose.VERIFY_EMAIL)).toBe(5 * 60);
  });

  it('returns 0 for an unknown purpose', () => {
    expect(timeLimitResend('some-other-purpose')).toBe(0);
  });

  it('uses exact hyphen-delimited enum string values', () => {
    expect(timeLimitResend('forgot-password')).toBe(120);
    expect(timeLimitResend('reset-password')).toBe(180);
    expect(timeLimitResend('verify-email')).toBe(300);
  });

  it('returns different limits for each defined purpose', () => {
    const forgot = timeLimitResend(OtpPurpose.FORGOT_PASSWORD);
    const reset = timeLimitResend(OtpPurpose.RESET_PASSWORD);
    const verify = timeLimitResend(VerifyUrlPurpose.VERIFY_EMAIL);

    expect(forgot).not.toBe(reset);
    expect(reset).not.toBe(verify);
    expect(forgot).not.toBe(verify);
  });
});
