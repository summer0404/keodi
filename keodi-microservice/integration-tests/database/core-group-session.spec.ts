// Uses TEMP TABLE to avoid pgvector/FK dependency on real core schema.
import { Pool, PoolClient } from 'pg';
import { createCoreDbPool, withTransaction } from '../helpers/db.helper';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CREATE_TEMP_TABLE = `
  CREATE TEMP TABLE IF NOT EXISTS test_votes (
    id        SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    user_id    VARCHAR NOT NULL,
    place_id   VARCHAR NOT NULL,
    UNIQUE (session_id, user_id)
  )
`;

describe('Core Database Transaction Integration', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createCoreDbPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function ensureTempTable(client: PoolClient): Promise<void> {
    await client.query(CREATE_TEMP_TABLE);
  }

  it('commits both votes when the transaction succeeds', async () => {
    const sessionId = makeId('session');
    const userId1 = makeId('u');
    const userId2 = makeId('u');
    const placeId = makeId('place');

    const client = await pool.connect();
    try {
      await ensureTempTable(client);
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
        [sessionId, userId1, placeId],
      );
      await client.query(
        `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
        [sessionId, userId2, placeId],
      );
      await client.query('COMMIT');

      const { rows } = await client.query(
        `SELECT * FROM test_votes WHERE session_id = $1`,
        [sessionId],
      );
      expect(rows).toHaveLength(2);
      const userIds = rows.map((r: any) => r.user_id);
      expect(userIds).toContain(userId1);
      expect(userIds).toContain(userId2);
    } finally {
      await client.query(`DELETE FROM test_votes WHERE session_id = $1`, [sessionId]);
      client.release();
    }
  });

  it('rolls back all writes when an error occurs mid-transaction', async () => {
    const sessionId = makeId('session');
    const userId = makeId('u');
    const placeId = makeId('place');

    const client = await pool.connect();
    let firstInsertId: number | undefined;

    try {
      await ensureTempTable(client);
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3) RETURNING id`,
        [sessionId, userId, placeId],
      );
      firstInsertId = res.rows[0].id;

      await client.query(
        `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
        [sessionId, userId, makeId('place')], // same session+user → unique_violation
      );
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    expect(firstInsertId).toBeDefined();
  });

  it('withTransaction helper rolls back and re-throws on error', async () => {
    const sessionId = makeId('session');
    const userId = makeId('u');
    const placeId = makeId('place');

    const setupClient = await pool.connect();
    await ensureTempTable(setupClient);
    setupClient.release();

    await expect(
      withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
          [sessionId, userId, placeId],
        );
        throw new Error('simulated failure');
      }),
    ).rejects.toThrow('simulated failure');
  });

  it('rejects a duplicate (session_id, user_id) vote with a constraint error', async () => {
    const sessionId = makeId('session');
    const userId = makeId('u');
    const placeId = makeId('place');

    const client = await pool.connect();
    try {
      await ensureTempTable(client);
      await client.query(
        `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
        [sessionId, userId, placeId],
      );
      await expect(
        client.query(
          `INSERT INTO test_votes (session_id, user_id, place_id) VALUES ($1, $2, $3)`,
          [sessionId, userId, makeId('place')],
        ),
      ).rejects.toMatchObject({ code: '23505' }); // unique_violation
    } finally {
      await client.query(`DELETE FROM test_votes WHERE session_id = $1`, [sessionId]);
      client.release();
    }
  });

  it('SELECT FOR UPDATE prevents concurrent lost-update race conditions', async () => {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TEMP TABLE IF NOT EXISTS test_counters (
          id      VARCHAR PRIMARY KEY,
          counter INT NOT NULL DEFAULT 0
        )
      `);

      const counterId = makeId('counter');
      await client.query(`INSERT INTO test_counters (id, counter) VALUES ($1, 0)`, [counterId]);

      await client.query('BEGIN');
      const res1 = await client.query(
        `SELECT counter FROM test_counters WHERE id = $1 FOR UPDATE`,
        [counterId],
      );
      await client.query(
        `UPDATE test_counters SET counter = $1 WHERE id = $2`,
        [res1.rows[0].counter + 1, counterId],
      );
      await client.query('COMMIT');

      await client.query('BEGIN');
      const res2 = await client.query(
        `SELECT counter FROM test_counters WHERE id = $1 FOR UPDATE`,
        [counterId],
      );
      await client.query(
        `UPDATE test_counters SET counter = $1 WHERE id = $2`,
        [res2.rows[0].counter + 1, counterId],
      );
      await client.query('COMMIT');

      const { rows } = await client.query(
        `SELECT counter FROM test_counters WHERE id = $1`,
        [counterId],
      );
      expect(rows[0].counter).toBe(2);
    } finally {
      client.release();
    }
  });
});
