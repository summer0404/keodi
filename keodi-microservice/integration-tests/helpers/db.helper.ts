import { execSync } from 'child_process';
import * as path from 'path';
import { Pool, PoolClient } from 'pg';

const REPO_ROOT = path.join(__dirname, '..', '..', '..');

export function createAuthDbPool(): Pool {
  return new Pool({
    connectionString:
      process.env.AUTH_DB_URL ??
      'postgresql://test_user:test_password_123@localhost:5435/keodi_test',
  });
}

export function createCoreDbPool(): Pool {
  return new Pool({
    connectionString:
      process.env.CORE_DB_URL ??
      'postgresql://test_user:test_password_123@localhost:5435/keodi_test',
  });
}

// Uses `migrate deploy` (not `migrate reset`) — applies pending migrations without dropping data.
export function runMigrations(serviceName: 'auth-service' | 'core-service', dbUrl: string): void {
  const serviceDir = path.join(REPO_ROOT, serviceName);
  try {
    execSync('npx prisma migrate deploy', {
      cwd: serviceDir,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    });
  } catch (err: any) {
    console.warn(
      `[db.helper] prisma migrate deploy failed for ${serviceName}: ${err.message ?? err}`,
    );
    // non-fatal — test will fail with a SQL error if schema is genuinely missing
  }
}

export async function cleanTable(pool: Pool, tableName: string): Promise<void> {
  await pool.query(`DELETE FROM "${tableName}"`);
}

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
