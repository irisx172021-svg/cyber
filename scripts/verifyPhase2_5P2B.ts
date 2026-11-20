import fs from 'fs';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import {
  assertConfirmedDevNeonBranch,
  createDrizzleDb,
  createNeonPool,
  redactPgSecrets,
} from '../src/db/client.ts';
import { validateSessionSecretStrength } from '../src/server/auth.ts';
import {
  DEFAULT_BACKUP_DB_PATH,
  DEFAULT_SOURCE_DB_PATH,
  EXPECTED_BASELINE_SHA256,
  importJsonToPostgres,
  loadValidatedSourceJson,
  runDrizzleMigrationsOnConfirmedDev,
  sha256File,
  verifySourceToPostgresParity,
} from './migrateJsonToPostgres.ts';

const REQUIRED_TABLES = [
  'users',
  'user_progress',
  'xp_events',
  'post_xp_daily_totals',
  'user_follows',
  'lab_exploration',
  'capstone_progress',
  'lab_notes',
  'posts',
  'post_votes',
  'groups',
  'group_members',
  'group_invitations',
  'group_join_requests',
  'group_messages',
  'timeline_events',
  'revoked_sessions',
  'migration_history',
];

export async function runPhase25P2BVerification(outputPath?: string): Promise<{
  ok: boolean;
  checks: Record<string, unknown>;
}> {
  const checks: Record<string, unknown> = {
    executedAt: new Date().toISOString(),
  };

  // 1. Auth secret strength check (no secret value logged)
  const sessionCheck = validateSessionSecretStrength(process.env.AUTH_SESSION_SECRET);
  checks.authSessionSecret = sessionCheck.valid === false
    ? { present: Boolean(process.env.AUTH_SESSION_SECRET), valid: false, reason: sessionCheck.reason }
    : { present: true, valid: true };

  // 2. Source & protected backup integrity check
  const liveSha = sha256File(DEFAULT_SOURCE_DB_PATH);
  const backupExists = fs.existsSync(DEFAULT_BACKUP_DB_PATH);
  const backupSha = backupExists ? sha256File(DEFAULT_BACKUP_DB_PATH) : null;
  const { db: sourceDb, sha256: validatedSha, metrics } = loadValidatedSourceJson(DEFAULT_SOURCE_DB_PATH);

  checks.sourceAndBackupIntegrity = {
    liveSha,
    backupExists,
    backupSha,
    backupMatchesExpectedBaseline: backupSha === EXPECTED_BASELINE_SHA256,
    liveMatchesExpectedBaseline: liveSha === EXPECTED_BASELINE_SHA256,
    sourceMetrics: metrics,
  };

  const pool1 = createNeonPool();
  const db1 = createDrizzleDb(pool1);

  try {
    // 3. Revalidate Neon dev branch identity + TLS
    const client1 = await pool1.connect();
    let identity1;
    try {
      identity1 = await assertConfirmedDevNeonBranch(client1);
    } finally {
      client1.release();
    }
    checks.branchConfirmation = identity1;

    // 4. Dry-run validation (zero writes before schema/import)
    const dryRun = await importJsonToPostgres({
      pool: pool1,
      db: db1,
      sourceDb,
      sourceSha256: validatedSha,
      dryRun: true,
    });
    checks.dryRunValidation = dryRun;

    // 5. Apply version-controlled Drizzle SQL migrations
    await runDrizzleMigrationsOnConfirmedDev(pool1, db1);

    const tableRows = await pool1.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const presentTables = tableRows.rows.map((r) => r.table_name);
    const missingTables = REQUIRED_TABLES.filter((t) => !presentTables.includes(t));

    const drizzleMigRows = await pool1.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations
    `);

    checks.schemaMigrations = {
      requiredCount: REQUIRED_TABLES.length,
      presentTablesCount: presentTables.length,
      missingTables,
      drizzleAppliedMigrationsCount: Number(drizzleMigRows.rows[0]?.count ?? 0),
    };

    // 6. Primary transactional import
    const firstImport = await importJsonToPostgres({
      pool: pool1,
      db: db1,
      sourceDb,
      sourceSha256: validatedSha,
      dryRun: false,
    });
    const firstParity = await verifySourceToPostgresParity(db1, sourceDb, validatedSha);
    checks.firstImport = {
      migrationKey: firstImport.migrationKey,
      parity: firstParity,
    };

    // 7. Idempotency & duplicate prevention (second run)
    const secondImport = await importJsonToPostgres({
      pool: pool1,
      db: db1,
      sourceDb,
      sourceSha256: validatedSha,
      dryRun: false,
    });
    const secondParity = await verifySourceToPostgresParity(db1, sourceDb, validatedSha);
    const migrationHistoryCountUnchanged =
      secondParity.destinationCounts.migration_history === firstParity.destinationCounts.migration_history;

    // Verify duplicate unique constraint rejection on email inside an aborted transaction
    let duplicateEmailRejected = false;
    let duplicateErrorCode: string | null = null;
    const probeEmail = sourceDb.accounts[0]?.email;
    if (probeEmail) {
      try {
        await db1.transaction(async (tx) => {
          await tx.insert(schema.users).values({
            id: 'usr-dup-probe',
            email: probeEmail,
            username: '@DuplicateProbe_Tmp',
            passwordHash: sourceDb.accounts[0].passwordHash,
          });
        });
      } catch (dupErr: any) {
        const pgCode = dupErr?.code ?? dupErr?.cause?.code ?? null;
        duplicateErrorCode = typeof pgCode === 'string' ? pgCode : null;
        duplicateEmailRejected = duplicateErrorCode === '23505';
      }
    }

    checks.idempotencyAndDuplicatePrevention = {
      secondMigrationKey: secondImport.migrationKey,
      secondRunParityOk: secondParity.ok && migrationHistoryCountUnchanged,
      migrationHistoryCountUnchanged,
      destinationCountsAfterSecondRun: secondParity.destinationCounts,
      aggregateXpAfterSecondRun: secondParity.aggregateXp,
      duplicateEmailRejectedWith23505: duplicateEmailRejected,
      duplicateErrorCode,
    };

    // 8. Transaction rollback atomicity test using disposable probe record
    const probeUserId = 'usr-tx-rollback-probe';
    let rollbackCaught = false;
    try {
      await db1.transaction(async (tx) => {
        await tx.insert(schema.users).values({
          id: probeUserId,
          email: 'rollback-probe@example.invalid',
          username: '@RollbackProbe_Tmp',
          passwordHash: sourceDb.accounts[0].passwordHash,
        });
        await tx.insert(schema.userProgress).values({
          userId: probeUserId,
          schemaVersion: 2,
          xp: 9999,
          streak: 1,
        });
        throw new Error('INTENTIONAL_ROLLBACK_TEST');
      });
    } catch (err: any) {
      if (String(err?.message).includes('INTENTIONAL_ROLLBACK_TEST')) {
        rollbackCaught = true;
      }
    }

    const probeAfterRollback = await db1
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, probeUserId));

    checks.transactionRollbackTest = {
      intentionalErrorCaught: rollbackCaught,
      probeRowsSurviving: probeAfterRollback.length,
      rollbackClean: rollbackCaught && probeAfterRollback.length === 0,
    };
  } finally {
    await pool1.end();
  }

  // 9. Persistence after database reconnection (fresh pool)
  const pool2 = createNeonPool();
  const db2 = createDrizzleDb(pool2);
  try {
    const client2 = await pool2.connect();
    let identity2;
    try {
      identity2 = await assertConfirmedDevNeonBranch(client2);
    } finally {
      client2.release();
    }
    const postReconnectParity = await verifySourceToPostgresParity(db2, sourceDb, validatedSha);
    checks.postReconnectPersistence = {
      reconnectedBranchId: identity2.branchId,
      reconnectedProjectId: identity2.projectId,
      parity: postReconnectParity,
    };
  } finally {
    await pool2.end();
  }

  // Confirm live JSON file and immutable backup were untouched by this run
  const postRunLiveSha = sha256File(DEFAULT_SOURCE_DB_PATH);
  const postRunBackupSha = backupExists ? sha256File(DEFAULT_BACKUP_DB_PATH) : null;
  checks.sourceJsonPreservedAfterAllChecks = {
    liveSha: postRunLiveSha,
    backupSha: postRunBackupSha,
    liveUnchangedDuringRun: postRunLiveSha === liveSha,
    backupMatchesExpectedBaseline: postRunBackupSha === EXPECTED_BASELINE_SHA256,
  };

  const ok =
    Boolean((checks.authSessionSecret as any)?.valid) &&
    Boolean((checks.sourceAndBackupIntegrity as any)?.backupMatchesExpectedBaseline) &&
    ((checks.schemaMigrations as any)?.missingTables?.length ?? 1) === 0 &&
    Boolean((checks.firstImport as any)?.parity?.ok) &&
    Boolean((checks.idempotencyAndDuplicatePrevention as any)?.secondRunParityOk) &&
    Boolean((checks.idempotencyAndDuplicatePrevention as any)?.duplicateEmailRejectedWith23505) &&
    Boolean((checks.transactionRollbackTest as any)?.rollbackClean) &&
    Boolean((checks.postReconnectPersistence as any)?.parity?.ok) &&
    Boolean((checks.sourceJsonPreservedAfterAllChecks as any)?.liveUnchangedDuringRun) &&
    Boolean((checks.sourceJsonPreservedAfterAllChecks as any)?.backupMatchesExpectedBaseline);

  const finalResult = { ok, checks };
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), { mode: 0o600 });
  }
  return finalResult;
}

const isMainEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('verifyPhase2_5P2B');

if (isMainEntry) {
  const outIdx = process.argv.indexOf('--out');
  const outPath = outIdx >= 0 ? process.argv[outIdx + 1] : undefined;
  runPhase25P2BVerification(outPath)
    .then((res) => {
      if (!outPath) {
        console.log(JSON.stringify(res, null, 2));
      }
      if (!res.ok) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      const safeErr = redactPgSecrets(String(err?.message || err));
      if (outPath) {
        fs.writeFileSync(
          outPath,
          JSON.stringify({ ok: false, fatalError: safeErr }, null, 2),
          { mode: 0o600 }
        );
      } else {
        console.error(safeErr);
      }
      process.exitCode = 1;
    });
}
