import { Pool, PoolClient } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

export const CONFIRMED_DEV_NEON_PROJECT_ID = 'rough-salad-06707647';
export const CONFIRMED_DEV_NEON_BRANCH_ID = 'br-little-brook-azw0rzn0';
export const CONFIRMED_DEV_NEON_ENDPOINT_PREFIX = 'ep-autumn-bread-aztnyc2j';
export const CONFIRMED_DEV_DATABASE_NAME = 'neondb';

export function redactPgSecrets(input: string): string {
  return input
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_POSTGRES_URI]')
    .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
    .replace(/password\s*=\s*[^\s;,'"]+/gi, 'password=[REDACTED]');
}

export function createNeonPool(databaseUrl?: string): Pool {
  const url = (databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
  if (!url) {
    throw new Error('DATABASE_URL is missing in the current execution environment.');
  }

  return new Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: true,
    },
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000,
    query_timeout: 30000,
  });
}

export function createDrizzleDb(pool: Pool): NodePgDatabase<typeof schema> {
  return drizzle(pool, { schema });
}

export interface VerifiedNeonIdentity {
  projectId: string;
  branchId: string;
  databaseName: string;
  endpointHost: string;
  endpointId: string;
  tlsAuthorized: boolean | null;
  tlsProtocol: string | null;
}

/**
 * Revalidates that the live PostgreSQL connection targets the confirmed
 * Neon development branch (`br-little-brook-azw0rzn0` in `rough-salad-06707647`)
 * before any DDL or DML writes are permitted.
 */
export async function assertConfirmedDevNeonBranch(
  client: PoolClient,
  databaseUrl?: string
): Promise<VerifiedNeonIdentity> {
  const rawUrl = (databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
  const parsed = new URL(rawUrl);
  const endpointHost = parsed.hostname;
  const endpointId = endpointHost.split('.')[0] || '';

  if (!endpointId.startsWith(CONFIRMED_DEV_NEON_ENDPOINT_PREFIX)) {
    throw new Error(
      `Refusing write operation: connected endpoint (${endpointId}) does not match confirmed development endpoint (${CONFIRMED_DEV_NEON_ENDPOINT_PREFIX}).`
    );
  }

  const res = await client.query<{
    project_id: string;
    branch_id: string;
    current_db: string;
  }>(`
    SELECT
      current_setting('neon.project_id', true) AS project_id,
      current_setting('neon.branch_id', true) AS branch_id,
      current_database() AS current_db
  `);

  const row = res.rows[0];
  if (!row || row.project_id !== CONFIRMED_DEV_NEON_PROJECT_ID) {
    throw new Error(
      `Refusing write operation: neon.project_id (${row?.project_id || 'null'}) does not match confirmed project (${CONFIRMED_DEV_NEON_PROJECT_ID}).`
    );
  }
  if (row.branch_id !== CONFIRMED_DEV_NEON_BRANCH_ID) {
    throw new Error(
      `Refusing write operation: neon.branch_id (${row?.branch_id || 'null'}) does not match confirmed development branch (${CONFIRMED_DEV_NEON_BRANCH_ID}).`
    );
  }
  if (row.current_db !== CONFIRMED_DEV_DATABASE_NAME) {
    throw new Error(
      `Refusing write operation: database (${row.current_db}) does not match confirmed database (${CONFIRMED_DEV_DATABASE_NAME}).`
    );
  }

  const stream = (client as any).connection?.stream;
  const tlsAuthorized = typeof stream?.authorized === 'boolean' ? stream.authorized : null;
  const tlsProtocol = typeof stream?.getProtocol === 'function' ? stream.getProtocol() : null;
  if (tlsAuthorized === false) {
    throw new Error('Refusing write operation: PostgreSQL TLS certificate verification failed.');
  }

  return {
    projectId: row.project_id,
    branchId: row.branch_id,
    databaseName: row.current_db,
    endpointHost,
    endpointId,
    tlsAuthorized,
    tlsProtocol,
  };
}
