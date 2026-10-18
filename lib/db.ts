import { Pool, QueryResult, QueryResultRow } from 'pg';

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://root@localhost:26257/auction_platform_db?sslmode=disable',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const client = await pool.connect();
  try {
    return await client.query<R>(text, params);
  } finally {
    client.release();
  }
}

export default pool;
