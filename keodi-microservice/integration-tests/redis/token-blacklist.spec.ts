import Redis from 'ioredis';
import { createRedisClient, flushTestKeys } from '../helpers/redis.helper';

function blacklistKey(token: string): string {
  return `blacklist_token:${token}`;
}

async function isBlacklisted(redis: Redis, token: string): Promise<boolean> {
  return (await redis.exists(blacklistKey(token))) === 1;
}

describe('Redis Token Blacklist Integration', () => {
  let redis: Redis;
  const runTs = Date.now();

  beforeAll(async () => {
    redis = createRedisClient();
    await redis.connect();
  });

  afterAll(async () => {
    await flushTestKeys(redis, `blacklist_token:test-token-${runTs}*`);
    await redis.quit();
  });

  afterEach(async () => {
    await flushTestKeys(redis, `blacklist_token:test-token-${runTs}*`);
  });

  it('EXISTS returns 1 (blacklisted) after setting the key', async () => {
    const token = `test-token-${runTs}-1`;
    await redis.set(blacklistKey(token), '1');
    expect(await redis.exists(blacklistKey(token))).toBe(1);
  });

  it('isBlacklisted returns true for a blacklisted token', async () => {
    const token = `test-token-${runTs}-2`;
    await redis.set(blacklistKey(token), '1');
    expect(await isBlacklisted(redis, token)).toBe(true);
  });

  it('removes a blacklisted token with DEL so EXISTS returns 0', async () => {
    const token = `test-token-${runTs}-3`;
    await redis.set(blacklistKey(token), '1');
    await redis.del(blacklistKey(token));
    expect(await isBlacklisted(redis, token)).toBe(false);
  });

  it('isBlacklisted returns false for a token that was never blacklisted', async () => {
    expect(await isBlacklisted(redis, `test-token-${runTs}-never-set`)).toBe(false);
  });

  it('blacklisted token with EX 2 expires after 2.5 s and is no longer present', async () => {
    const token = `test-token-${runTs}-5`;
    await redis.set(blacklistKey(token), '1', 'EX', 2);
    expect(await isBlacklisted(redis, token)).toBe(true);
    await new Promise((r) => setTimeout(r, 2500));
    expect(await isBlacklisted(redis, token)).toBe(false);
  }, 15000);

  it('blacklisting multiple tokens creates independent keys', async () => {
    const tokens = [
      `test-token-${runTs}-6a`,
      `test-token-${runTs}-6b`,
      `test-token-${runTs}-6c`,
    ];
    for (const token of tokens) {
      await redis.set(blacklistKey(token), '1');
    }
    for (const token of tokens) {
      expect(await isBlacklisted(redis, token)).toBe(true);
    }
    await redis.del(blacklistKey(tokens[1]));
    expect(await isBlacklisted(redis, tokens[0])).toBe(true);
    expect(await isBlacklisted(redis, tokens[1])).toBe(false);
    expect(await isBlacklisted(redis, tokens[2])).toBe(true);
  });

  it('can re-blacklist a token after it has been removed', async () => {
    const token = `test-token-${runTs}-7`;
    await redis.set(blacklistKey(token), '1');
    await redis.del(blacklistKey(token));
    expect(await isBlacklisted(redis, token)).toBe(false);
    await redis.set(blacklistKey(token), '1');
    expect(await isBlacklisted(redis, token)).toBe(true);
  });

  it('blacklist key TTL matches the EX value provided on SET', async () => {
    const token = `test-token-${runTs}-8`;
    const expirySeconds = 300;
    await redis.set(blacklistKey(token), '1', 'EX', expirySeconds);
    const ttl = await redis.ttl(blacklistKey(token));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(expirySeconds);
  });
});
