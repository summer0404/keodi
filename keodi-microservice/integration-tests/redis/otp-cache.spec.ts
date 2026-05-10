import Redis from 'ioredis';
import { createRedisClient, flushTestKeys } from '../helpers/redis.helper';

const OTP_TTL = {
  FORGOT_PASSWORD: 180,
  RESET_PASSWORD: 300,
  VERIFY_EMAIL: 3600,
} as const;

function otpKey(purpose: string, userId: string): string {
  return `otp:${purpose}:${userId}`;
}

describe('Redis OTP Cache Integration', () => {
  let redis: Redis;
  const runTs = Date.now();

  beforeAll(async () => {
    redis = createRedisClient();
    await redis.connect();
  });

  afterAll(async () => {
    await flushTestKeys(redis, `otp:*:test-${runTs}*`);
    await redis.quit();
  });

  afterEach(async () => {
    await flushTestKeys(redis, `otp:*:test-${runTs}*`);
  });

  it('stores OTP with forgot-password TTL (≤ 180 s, > 0)', async () => {
    const key = otpKey('forgot-password', `test-${runTs}-1`);
    await redis.set(key, 'hash_abc123', 'EX', OTP_TTL.FORGOT_PASSWORD);
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(OTP_TTL.FORGOT_PASSWORD);
  });

  it('stores OTP with reset-password TTL (≤ 300 s, > 0)', async () => {
    const key = otpKey('reset-password', `test-${runTs}-2`);
    await redis.set(key, 'hash_def456', 'EX', OTP_TTL.RESET_PASSWORD);
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(OTP_TTL.RESET_PASSWORD);
  });

  it('stores OTP with verify-email TTL (≤ 3600 s, > 0)', async () => {
    const key = otpKey('verify-email', `test-${runTs}-3`);
    await redis.set(key, 'hash_ghi789', 'EX', OTP_TTL.VERIFY_EMAIL);
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(OTP_TTL.VERIFY_EMAIL);
  });

  it('retrieves the stored OTP hash by key', async () => {
    const key = otpKey('forgot-password', `test-${runTs}-4`);
    await redis.set(key, 'bcrypt_hash_value_xyz', 'EX', OTP_TTL.FORGOT_PASSWORD);
    expect(await redis.get(key)).toBe('bcrypt_hash_value_xyz');
  });

  it('returns null after the OTP key is deleted', async () => {
    const key = otpKey('forgot-password', `test-${runTs}-5`);
    await redis.set(key, 'otp_to_delete', 'EX', OTP_TTL.FORGOT_PASSWORD);
    await redis.del(key);
    expect(await redis.get(key)).toBeNull();
  });

  it('key expires and returns null after TTL elapses', async () => {
    const key = otpKey('forgot-password', `test-${runTs}-6`);
    await redis.set(key, 'short_lived_otp', 'EX', 1);
    await new Promise((r) => setTimeout(r, 1500));
    expect(await redis.get(key)).toBeNull();
  }, 10000);

  it('returns null for a key that was never set', async () => {
    expect(await redis.get(otpKey('forgot-password', `test-${runTs}-nonexistent`))).toBeNull();
  });

  it('OTP keys for different purposes do not affect each other', async () => {
    const userId = `test-${runTs}-7`;
    const forgotKey = otpKey('forgot-password', userId);
    const resetKey = otpKey('reset-password', userId);
    const verifyKey = otpKey('verify-email', userId);

    await redis.set(forgotKey, 'hash_forgot', 'EX', OTP_TTL.FORGOT_PASSWORD);
    await redis.set(resetKey, 'hash_reset', 'EX', OTP_TTL.RESET_PASSWORD);
    await redis.set(verifyKey, 'hash_verify', 'EX', OTP_TTL.VERIFY_EMAIL);

    await redis.del(forgotKey);

    expect(await redis.get(forgotKey)).toBeNull();
    expect(await redis.get(resetKey)).toBe('hash_reset');
    expect(await redis.get(verifyKey)).toBe('hash_verify');
  });

  it('overwriting an existing OTP updates the value and resets the TTL', async () => {
    const key = otpKey('forgot-password', `test-${runTs}-8`);
    await redis.set(key, 'old_hash', 'EX', 10);
    await redis.set(key, 'new_hash', 'EX', OTP_TTL.FORGOT_PASSWORD);

    expect(await redis.get(key)).toBe('new_hash');
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(10);
    expect(ttl).toBeLessThanOrEqual(OTP_TTL.FORGOT_PASSWORD);
  });
});
