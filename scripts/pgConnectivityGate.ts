import fs from 'fs';
import { Client } from 'pg';
import { validateSessionSecretStrength } from '../src/server/auth.ts';

const OUTPUT_PATH = '/tmp/pg_connectivity_gate.json';

function redactSecrets(input: string): string {
  return input
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_POSTGRES_URI]')
    .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
    .replace(/password\s*=\s*[^\s;,'"]+/gi, 'password=[REDACTED]');
}

async function runGate(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL?.trim() || '';
  const groqKey = process.env.GROQ_API_KEY?.trim() || '';
  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() || '';

  const sessionCheck = validateSessionSecretStrength(sessionSecret);

  const report: Record<string, unknown> = {
    executedAt: new Date().toISOString(),
    secrets: {
      DATABASE_URL: dbUrl ? 'PRESENT' : 'MISSING',
      GROQ_API_KEY: groqKey ? 'PRESENT' : 'MISSING',
      AUTH_SESSION_SECRET: sessionSecret ? 'PRESENT' : 'MISSING',
    },
    authSessionSecretValidation: sessionCheck.valid === false
      ? { valid: false, reason: sessionCheck.reason }
      : { valid: true },
    connectivity: {
      attempted: false,
      ok: false,
    },
  };

  if (!dbUrl) {
    report.connectivity = {
      attempted: false,
      ok: false,
      error: 'DATABASE_URL is MISSING in the runtime environment.',
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), { mode: 0o600 });
    return;
  }

  let parsedHost = '';
  let endpointId = '';
  let databaseName = '';
  let port = '5432';
  let sslModeParam: string | null = null;
  let channelBindingParam: string | null = null;

  try {
    const parsed = new URL(dbUrl);
    parsedHost = parsed.hostname;
    endpointId = parsedHost.split('.')[0] || '';
    databaseName = parsed.pathname.replace(/^\//, '');
    port = parsed.port || '5432';
    sslModeParam = parsed.searchParams.get('sslmode');
    channelBindingParam = parsed.searchParams.get('channel_binding');
  } catch (err: any) {
    report.connectivity = {
      attempted: false,
      ok: false,
      error: `Failed to parse DATABASE_URL format: ${redactSecrets(String(err?.message || err))}`,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), { mode: 0o600 });
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: true,
    },
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });

  try {
    await client.connect();

    const stream = (client as any).connection?.stream;
    const tlsInfo = {
      rejectUnauthorizedEnforced: true,
      tlsAuthorized: typeof stream?.authorized === 'boolean' ? stream.authorized : null,
      tlsProtocol: typeof stream?.getProtocol === 'function' ? stream.getProtocol() : null,
      tlsCipher: typeof stream?.getCipher === 'function' ? stream.getCipher()?.name || null : null,
    };

    const selectOne = await client.query('SELECT 1 AS ok');
    const metaRes = await client.query(`
      SELECT
        version() AS server_version,
        current_database() AS current_database,
        current_schema() AS current_schema,
        has_schema_privilege(current_user, 'public', 'USAGE') AS public_usage,
        has_schema_privilege(current_user, 'public', 'CREATE') AS public_create,
        has_database_privilege(current_user, current_database(), 'CREATE') AS db_create,
        has_database_privilege(current_user, current_database(), 'TEMP') AS db_temp
    `);

    const settingsRes = await client.query(`
      SELECT name, setting
      FROM pg_settings
      WHERE name IN ('ssl', 'ssl_library', 'server_version')
         OR name LIKE '%neon%'
         OR name LIKE '%branch%'
      ORDER BY name
    `);

    const schemasRes = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT LIKE 'pg_%'
        AND schema_name <> 'information_schema'
      ORDER BY schema_name
    `);

    const tablesRes = await client.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);

    // Read-only transaction test
    await client.query('BEGIN');
    const txRes = await client.query('SELECT 1 AS tx_ok');
    await client.query('ROLLBACK');

    report.connectivity = {
      attempted: true,
      ok: selectOne.rows[0]?.ok === 1,
      selectOne: selectOne.rows[0] || null,
      transactionSupported: txRes.rows[0]?.tx_ok === 1,
      tls: tlsInfo,
      endpoint: {
        hostname: parsedHost,
        endpointId,
        port,
        databaseName,
        sslModeParam,
        channelBindingParam,
      },
      metadata: metaRes.rows[0] || null,
      pgSettings: settingsRes.rows,
      schemas: schemasRes.rows.map((r) => r.schema_name),
      existingTables: tablesRes.rows,
    };
  } catch (err: any) {
    report.connectivity = {
      attempted: true,
      ok: false,
      endpoint: {
        hostname: parsedHost,
        endpointId,
        port,
        databaseName,
        sslModeParam,
        channelBindingParam,
      },
      error: redactSecrets(String(err?.message || err)),
      code: err?.code || null,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore cleanup errors
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), { mode: 0o600 });
}

runGate().catch((err) => {
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        fatalError: redactSecrets(String(err?.message || err)),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
});
