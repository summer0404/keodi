#!/usr/bin/env node
/**
 * Mock Location Simulator for Group Session Testing
 *
 * Injects fake member locations directly into Redis so the recommendation
 * engine (which requires >= 2 active member locations) can be tested solo.
 *
 * Usage (run from keodi-microservice/core-service/):
 *   node scripts/mock-locations.mjs \
 *     --session <sessionId> \
 *     --member-ids <userId1,userId2> \ 
 *     [--lat 10.7769] [--lng 106.7009] \
 *     [--spread 0.005] \
 *     [--ttl 300] \
 *     [--interval 15]
 * 
 * Note: userId not memberId
 */

import Redis from 'ioredis';

// ─── Parse CLI Args ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      parsed[key] = val;
    }
  }
  return parsed;
}

const args = parseArgs();

const SESSION_ID = args['session'];
const MEMBER_IDS = (args['member-ids'] ?? '')
  .split(/[,\n]+/)
  .map(s => s.trim())
  .filter(Boolean);
const CENTER_LAT = parseFloat(args['lat'] ?? '10.7769');
const CENTER_LNG = parseFloat(args['lng'] ?? '106.7009');
const SPREAD = parseFloat(args['spread'] ?? '0.005');
const TTL = parseInt(args['ttl'] ?? '300', 10);
const INTERVAL = parseInt(args['interval'] ?? '15', 10);

// Redis connection — matches core-service .env
const REDIS_HOST = args['redis-host'] ?? 'redis-18674.crce194.ap-seast-1-1.ec2.cloud.redislabs.com';
const REDIS_PORT = parseInt(args['redis-port'] ?? '18674', 10);
const REDIS_PASSWORD = args['redis-password'] ?? 'bDWFA905nFfJDNt203r2lSJTMqbVm5b7';

// ─── Validation ──────────────────────────────────────────────────────────────

if (!SESSION_ID) {
  console.error('❌ --session is required');
  process.exit(1);
}

if (MEMBER_IDS.length === 0) {
  console.error('❌ --member-ids is required (comma-separated userIds of real session members)');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateLocations() {
  return MEMBER_IDS.map(id => ({
    id,
    latitude: CENTER_LAT + (Math.random() - 0.5) * SPREAD * 2,
    longitude: CENTER_LNG + (Math.random() - 0.5) * SPREAD * 2,
  }));
}

// Matches RedisKeys.GROUP_SESSION.MEMBER_LOCATION in core-service
function redisKey(sessionId, userId) {
  return `session:${sessionId}:location:${userId}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('🚀 Group Session Mock Location Simulator');
  console.log(`   Session:    ${SESSION_ID}`);
  console.log(`   Member IDs: ${MEMBER_IDS.join(', ')}`);
  console.log(`   Center:     (${CENTER_LAT}, ${CENTER_LNG})`);
  console.log(`   Spread:     ±${SPREAD}° (~${(SPREAD * 111).toFixed(1)}km)`);
  console.log(`   TTL:        ${TTL}s`);
  console.log(`   Interval:   ${INTERVAL === 0 ? 'one-shot' : `${INTERVAL}s`}`);
  console.log('');

  console.log(`📡 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  });

  redis.on('error', (err) => console.error('❌ Redis error:', err.message));

  // ioredis connects lazily — ping to verify
  try {
    await redis.ping();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to Redis\n');

  async function injectLocations() {
    const locations = generateLocations();
    const now = Date.now();

    for (const loc of locations) {
      const key = redisKey(SESSION_ID, loc.id);
      const value = JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: now,
      });

      await redis.setex(key, TTL, value);
      console.log(`  📍 ${loc.id}`);
      console.log(`     → (${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)})`);
      console.log(`     → key: ${key}`);
    }
    console.log(`\n  ✅ ${locations.length} locations set (TTL: ${TTL}s)\n`);
  }

  await injectLocations();

  if (INTERVAL > 0) {
    console.log(`🔄 Refreshing every ${INTERVAL}s — press Ctrl+C to stop\n`);

    const timer = setInterval(async () => {
      console.log(`--- Refresh at ${new Date().toLocaleTimeString()} ---`);
      await injectLocations();
    }, INTERVAL * 1000);

    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping...');
      clearInterval(timer);
      for (const id of MEMBER_IDS) {
        const key = redisKey(SESSION_ID, id);
        await redis.del(key);
        console.log(`  🧹 Deleted ${key}`);
      }
      redis.disconnect();
      console.log('✅ Done');
      process.exit(0);
    });
  } else {
    console.log('✅ One-shot mode complete.');
    redis.disconnect();
  }
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
