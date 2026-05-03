import { Pool, PoolClient } from 'pg';

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://test_user:test_password_123@localhost:5435/keodi_test';

export function createAuthDbPool(): Pool {
  return new Pool({ connectionString: TEST_DB_URL });
}

export function createCoreDbPool(): Pool {
  return new Pool({ connectionString: TEST_DB_URL });
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
