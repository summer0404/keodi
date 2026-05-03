import { Pool, PoolClient } from 'pg';
import { createAuthDbPool, runMigrations, withTransaction } from '../helpers/db.helper';

function makeTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('Auth Database Integration', () => {
  let pool: Pool;
  const runSuffix = Date.now();
  const insertedUserIds: string[] = [];

  beforeAll(async () => {
    const dbUrl =
      process.env.AUTH_DB_URL ??
      'postgresql://test_user:test_password_123@localhost:5435/keodi_test';
    runMigrations('auth-service', dbUrl);
    pool = createAuthDbPool();
    try {
      await pool.query('SELECT 1 FROM "users" LIMIT 1');
    } catch (err: any) {
      throw new Error(
        `"users" table not found in test DB — migrations may have failed. Original error: ${err.message}`,
      );
    }
  });

  afterAll(async () => {
    if (insertedUserIds.length > 0) {
      try {
        await pool.query(`DELETE FROM "users" WHERE id = ANY($1::text[])`, [insertedUserIds]);
      } catch {
        // best-effort
      }
    }
    await pool.end();
  });

  async function insertUser(
    client: PoolClient | Pool,
    overrides: Partial<{ id: string; username: string; password: string; email: string }> = {},
  ): Promise<string> {
    const id = overrides.id ?? makeTestId('u');
    const username = overrides.username ?? `user_${runSuffix}_${id.slice(-6)}`;
    const password = overrides.password ?? 'hashed_password_value';
    const email = overrides.email ?? `${id}@test.example`;
    await client.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id, username, password, email],
    );
    insertedUserIds.push(id);
    return id;
  }

  it('inserts a user and retrieves all fields correctly', async () => {
    const id = makeTestId('u');
    const username = `testuser_${runSuffix}`;
    const email = `create_${runSuffix}@test.example`;
    const password = 'hashed_pw_abc';

    await pool.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id, username, password, email],
    );
    insertedUserIds.push(id);

    const { rows } = await pool.query(
      `SELECT id, username, password, email, role, is_verified, refresh_token FROM "users" WHERE id = $1`,
      [id],
    );

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.id).toBe(id);
    expect(row.username).toBe(username);
    expect(row.password).toBe(password);
    expect(row.email).toBe(email);
    expect(row.role).toBe('USER');
    expect(row.is_verified).toBe(false);
    expect(row.refresh_token).toBeNull();

    await pool.query('DELETE FROM "users" WHERE id = $1', [id]);
  });

  it('rejects a second INSERT with a duplicate email', async () => {
    const email = `dup_email_${runSuffix}@test.example`;
    const id1 = makeTestId('u');
    const id2 = makeTestId('u');

    await pool.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id1, `uname1_${runSuffix}`, 'pw', email],
    );
    insertedUserIds.push(id1);

    await expect(
      pool.query(
        `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
        [id2, `uname2_${runSuffix}`, 'pw', email],
      ),
    ).rejects.toMatchObject({
      code: '23505', // unique_violation
    });

    await pool.query('DELETE FROM "users" WHERE id = $1', [id1]);
  });

  it('rejects a second INSERT with a duplicate username', async () => {
    const username = `dupname_${runSuffix}`;
    const id1 = makeTestId('u');
    const id2 = makeTestId('u');

    await pool.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id1, username, 'pw', `em1_${runSuffix}@test.example`],
    );
    insertedUserIds.push(id1);

    await expect(
      pool.query(
        `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
        [id2, username, 'pw', `em2_${runSuffix}@test.example`],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    await pool.query('DELETE FROM "users" WHERE id = $1', [id1]);
  });

  it('updates is_verified to true and persists the change', async () => {
    const id = makeTestId('u');
    await pool.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [id, `verify_user_${runSuffix}`, 'pw', `verify_${runSuffix}@test.example`],
    );
    insertedUserIds.push(id);

    await pool.query(
      `UPDATE "users" SET is_verified = true, updated_at = NOW() WHERE id = $1`,
      [id],
    );

    const { rows } = await pool.query(`SELECT is_verified FROM "users" WHERE id = $1`, [id]);
    expect(rows[0].is_verified).toBe(true);

    await pool.query('DELETE FROM "users" WHERE id = $1', [id]);
  });

  it('cascades user deletion to user_device_tokens', async () => {
    const userId = makeTestId('u');
    const tokenId = makeTestId('dt');

    await pool.query(
      `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      [userId, `cascade_user_${runSuffix}`, 'pw', `cascade_${runSuffix}@test.example`],
    );
    insertedUserIds.push(userId);

    await pool.query(
      `INSERT INTO "user_device_tokens" (id, user_id, token, platform, updated_at) VALUES ($1, $2, $3, 'IOS', NOW())`,
      [tokenId, userId, `device-token-${runSuffix}`],
    );

    const before = await pool.query(`SELECT id FROM "user_device_tokens" WHERE id = $1`, [tokenId]);
    expect(before.rows).toHaveLength(1);

    await pool.query('DELETE FROM "users" WHERE id = $1', [userId]);

    const after = await pool.query(`SELECT id FROM "user_device_tokens" WHERE id = $1`, [tokenId]);
    expect(after.rows).toHaveLength(0);
  });

  it('rolls back the entire transaction when an error occurs mid-way', async () => {
    const id = makeTestId('u');
    const email = `tx_test_${runSuffix}@test.example`;

    await expect(
      withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
          [id, `tx_user_${runSuffix}`, 'pw', email],
        );
        await client.query(
          `INSERT INTO "users" (id, username, password, email, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
          [makeTestId('u'), `tx_user2_${runSuffix}`, 'pw', email],
        );
      }),
    ).rejects.toBeDefined();

    const { rows } = await pool.query(`SELECT id FROM "users" WHERE id = $1`, [id]);
    expect(rows).toHaveLength(0);
  });
});
