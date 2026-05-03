const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(
    fs.readFileSync(envFile, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

module.exports = async function globalSetup() {
  const env = loadEnv();
  const dbUrl =
    env.DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://test_user:test_password_123@localhost:5435/keodi_test';

  const authServiceDir = path.join(__dirname, '..', '..', 'auth-service');

  console.log('\n[setup] Applying Prisma migrations to test database...');
  const result = spawnSync(
    'npx',
    ['prisma', 'migrate', 'deploy', '--config=src/configs/prisma.config.ts'],
    {
      cwd: authServiceDir,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
      shell: true,
    },
  );

  if (result.status !== 0) {
    console.warn('[setup] Migration failed — database tests may fail if schema is missing');
  }
};
