import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { isDeepStrictEqual } from 'util';
import { inArray } from 'drizzle-orm';
import * as schema from '../src/db/schema.ts';
import {
  assertConfirmedDevNeonBranch,
  createDrizzleDb,
  createNeonPool,
  redactPgSecrets,
} from '../src/db/client.ts';
import { hashPasswordSync, isScryptHash, validateSessionSecretStrength } from '../src/server/auth.ts';
import { isBlockedAppPath } from '../src/server/security.ts';
import { DbSchema } from '../src/server/migration.ts';
import { createDefaultLearningProfile } from '../src/lib/learningProfile.ts';
import {
  assertPostgresStorageReadyOrFailClosed,
  atomicAwardXpEventPg,
  compareSourceJsonWithPg,
  detectReseededSeedOverwrite,
  detectSourceVsPgConflicts,
  REQUIRED_PG_TABLES,
  verifyCutoverParityGate,
} from '../src/server/cutoverGuard.ts';
import {
  createAndStoreEncryptedNeonBackup,
  decryptRecoveryPayload,
  encryptRecoveryPayload,
  exportDbSchemaFromPostgres,
  readAndDecryptBackupFile,
  verifyLatestEncryptedNeonBackup,
  writeEncryptedBackupFile,
} from '../src/server/recoveryBackup.ts';
import {
  DEFAULT_BACKUP_DB_PATH,
  DEFAULT_SOURCE_DB_PATH,
  detectZeroCaseCollisionsInPg,
  EXPECTED_BASELINE_SHA256,
  importJsonToPostgres,
  loadValidatedSourceJson,
  runDrizzleMigrationsOnConfirmedDev,
  sha256File,
} from './migrateJsonToPostgres.ts';
import { TestCookieClient } from './testHttpClient.ts';
import { writeBaselineFixtureCopy } from './testFixtures.ts';

process.env.CFA_NO_LISTEN = '1';

function buildIsolatedVerificationFixture(): DbSchema {
  const hashA = hashPasswordSync('IsolatedFixturePass!2026A');
  const hashB = hashPasswordSync('IsolatedFixturePass!2026B');
  const defaultProfile = createDefaultLearningProfile();
  const customProfile = {
    interests: ['pathway-soc-detection', 'pathway-cloud-sec'],
    experienceLevel: 'experienced' as const,
    goals: 'Validate PostgreSQL round-trip fidelity for customized profiles',
    onboardingCompleted: true,
    updatedAt: '2026-11-21T00:00:00.000Z',
  };

  return {
    schemaVersion: 2,
    accounts: [
      {
        email: 'probe-default@example.invalid',
        passwordHash: hashA,
        tokenVersion: 2,
        user: {
          id: 'usr-verify-probe-a',
          username: '@VerifyProbeA',
          email: 'probe-default@example.invalid',
          xp: 450,
          streak: 3,
          level: 1,
          rank: 'Cadet',
          completion: 1,
          verifiedTopics: ['comp-hardware'],
          following: ['@VerifyProbeB'],
          followers: [],
          lastActiveDate: '2026-11-21',
          lastStreakUpdate: '2026-11-21',
          lastActiveTimestamp: '2026-11-21T00:00:00.000Z',
          learningProfile: defaultProfile,
        },
        progress: {
          schemaVersion: 2,
          completedLessonIds: ['comp-hardware'],
          completedExerciseIds: ['lab-comp-hardware'],
          completedQuizLessonIds: ['comp-hardware'],
          completedHomeworkLessonIds: [],
          legacyCompletedLessonIds: [],
          awardedXpEventIds: ['submit_quiz:comp-hardware', 'complete_exercise:lab-comp-hardware'],
          postXpDailyLog: { '2026-11-21': 50 },
          xp: 450,
          streak: 3,
          lastActiveDate: '2026-11-21',
          lastStreakUpdate: '2026-11-21',
          lastActiveTimestamp: '2026-11-21T00:00:00.000Z',
          lastSyncedAt: '2026-11-21T00:00:00.000Z',
          updatedAt: '2026-11-21T00:00:00.000Z',
        },
        labNotes: [
          {
            id: 'note-verify-probe-1',
            moduleId: 'comp-hardware',
            moduleTitle: 'Computer Hardware',
            title: 'Probe Note',
            content: 'Transactional isolation check note.',
            lastSaved: '2026-11-21T00:00:00.000Z',
          },
        ],
        labExploration: {
          'lab-comp-hardware': {
            exploredDiagramIds: ['cpu', 'ram'],
            executedTerminalCommands: [],
            logTargetVerified: false,
            verifiedLogEntryId: null,
            scenarioVerified: false,
            verifiedHighlightLines: [],
            explorationComplete: true,
          },
        },
        capstoneProgress: {
          'capstone-soc-investigation': {
            capstoneId: 'capstone-soc-investigation',
            currentStageId: 'stage-1',
            stages: {
              'stage-1': {
                evidenceVerified: true,
                verifiedEvidenceIds: ['ev-1'],
                knowledgeCheckPassed: false,
              },
            },
            reportSubmitted: false,
          },
        },
      },
      {
        email: 'probe-custom@example.invalid',
        passwordHash: hashB,
        tokenVersion: 1,
        user: {
          id: 'usr-verify-probe-b',
          username: '@VerifyProbeB',
          email: 'probe-custom@example.invalid',
          xp: 0,
          streak: 0,
          level: 1,
          rank: 'Cadet',
          completion: 0,
          verifiedTopics: [],
          following: [],
          followers: ['@VerifyProbeA'],
          lastActiveDate: null,
          learningProfile: customProfile,
        },
        progress: {
          schemaVersion: 2,
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          legacyCompletedLessonIds: [],
          awardedXpEventIds: [],
          xp: 0,
          streak: 0,
          lastActiveDate: null,
        },
        labNotes: [],
      },
    ],
    posts: [
      {
        id: 'post-verify-probe-1',
        title: 'Probe Post',
        author: 'VerifyProbeA',
        authorRole: 'Cadet',
        content: 'Transactional post verification content.',
        category: 'General',
        upvotes: 1,
        userVote: 'up',
        votesByUserId: { 'usr-verify-probe-a': 'up' },
        createdAt: '2026-11-21T00:00:00.000Z',
        commentsCount: 0,
      },
    ],
    timelineEvents: [
      {
        id: 'ev-verify-probe-1',
        username: '@VerifyProbeA',
        action: 'completed Computer Hardware',
        xpReward: 400,
        timestamp: '2026-11-21T00:00:00.000Z',
      },
    ],
    groups: [
      {
        id: 'grp-verify-probe-1',
        name: 'Probe Squad',
        description: 'Transactional group verification',
        avatar: '🛡️',
        visibility: 'private',
        ownerId: 'usr-verify-probe-a',
        ownerHandle: '@VerifyProbeA',
        members: ['@VerifyProbeA'],
        invitations: [
          {
            id: 'inv-verify-probe-1',
            username: '@VerifyProbeB',
            invitedBy: '@VerifyProbeA',
            createdAt: '2026-11-21T00:00:00.000Z',
            expiresAt: '2026-12-21T00:00:00.000Z',
          },
        ],
        joinRequests: [
          {
            id: 'req-verify-probe-1',
            username: '@VerifyProbeB',
            requestedAt: '2026-11-21T00:00:00.000Z',
          },
        ],
        messages: [
          {
            id: 'msg-verify-probe-1',
            senderId: 'usr-verify-probe-a',
            senderUsername: '@VerifyProbeA',
            senderRole: 'Cadet',
            content: 'Probe message',
            createdAt: '2026-11-21T00:00:00.000Z',
          },
        ],
        createdAt: '2026-11-21T00:00:00.000Z',
      },
    ],
    revokedSessions: [
      {
        sid: 'sid-verify-probe-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    ],
  };
}

async function inspectMigratedNeonBaseline(db: ReturnType<typeof createDrizzleDb>) {
  const [
    pgUsers,
    pgProgress,
    pgXpEvents,
    pgFollows,
    pgLabNotes,
    pgPosts,
    pgGroups,
    pgGroupMembers,
    pgGroupMessages,
    pgTimelineEvents,
    pgMigrationHistory,
  ] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.userProgress),
    db.select().from(schema.xpEvents),
    db.select().from(schema.userFollows),
    db.select().from(schema.labNotes),
    db.select().from(schema.posts),
    db.select().from(schema.groups),
    db.select().from(schema.groupMembers),
    db.select().from(schema.groupMessages),
    db.select().from(schema.timelineEvents),
    db.select().from(schema.migrationHistory),
  ]);

  const scryptHashesVerified = pgUsers.filter((u) => isScryptHash(u.passwordHash)).length;
  const aggregateXp = pgProgress.reduce((sum, p) => sum + p.xp, 0);
  const completedLessonsCount = pgProgress.reduce(
    (sum, p) => sum + (p.completedLessonIds?.length ?? 0),
    0
  );
  const customProfileAccount = pgUsers.find((u) => u.id === 'usr-q5i3h0dmd');
  const baselineMigrationRecord = pgMigrationHistory.find(
    (m) => m.sourceSha256 === EXPECTED_BASELINE_SHA256
  );

  const mismatches: string[] = [];
  if (pgUsers.length !== 6) mismatches.push(`Expected 6 users in Neon, got ${pgUsers.length}`);
  if (pgProgress.length !== 6) mismatches.push(`Expected 6 user_progress rows, got ${pgProgress.length}`);
  if (scryptHashesVerified !== 6) mismatches.push(`Expected 6 scrypt hashes, got ${scryptHashesVerified}`);
  if (aggregateXp !== 7950) mismatches.push(`Expected 7950 aggregate XP, got ${aggregateXp}`);
  if (completedLessonsCount !== 9) {
    mismatches.push(`Expected 9 completed lessons, got ${completedLessonsCount}`);
  }
  if (pgXpEvents.length !== 9) mismatches.push(`Expected 9 xp_events, got ${pgXpEvents.length}`);
  if (pgFollows.length !== 5) mismatches.push(`Expected 5 user_follows, got ${pgFollows.length}`);
  if (pgLabNotes.length !== 2) mismatches.push(`Expected 2 lab_notes, got ${pgLabNotes.length}`);
  if (pgPosts.length !== 4) mismatches.push(`Expected 4 posts, got ${pgPosts.length}`);
  if (pgGroups.length !== 2) mismatches.push(`Expected 2 groups, got ${pgGroups.length}`);
  if (pgGroupMembers.length !== 5) mismatches.push(`Expected 5 group_members, got ${pgGroupMembers.length}`);
  if (pgGroupMessages.length !== 3) mismatches.push(`Expected 3 group_messages, got ${pgGroupMessages.length}`);
  if (pgTimelineEvents.length !== 3) mismatches.push(`Expected 3 timeline_events, got ${pgTimelineEvents.length}`);
  if (!customProfileAccount) {
    mismatches.push('Missing account usr-q5i3h0dmd in Neon development branch');
  } else if (
    customProfileAccount.learningProfile !== null &&
    (typeof customProfileAccount.learningProfile !== 'object' ||
      !Array.isArray(customProfileAccount.learningProfile.interests))
  ) {
    mismatches.push('Invalid learningProfile structure on usr-q5i3h0dmd');
  }
  if (!baselineMigrationRecord) {
    mismatches.push(`Missing migration_history record for baseline ${EXPECTED_BASELINE_SHA256}`);
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    counts: {
      users: pgUsers.length,
      user_progress: pgProgress.length,
      xp_events: pgXpEvents.length,
      user_follows: pgFollows.length,
      lab_notes: pgLabNotes.length,
      posts: pgPosts.length,
      groups: pgGroups.length,
      group_members: pgGroupMembers.length,
      group_messages: pgGroupMessages.length,
      timeline_events: pgTimelineEvents.length,
      migration_history: pgMigrationHistory.length,
    },
    scryptHashesVerified,
    aggregateXp,
    completedLessonsCount,
    sixthAccountPresent: Boolean(customProfileAccount),
    sixthAccountProfileExperienceLevel: customProfileAccount?.learningProfile?.experienceLevel ?? null,
  };
}

export async function runPhase25P2BVerification(options?: {
  outputPath?: string;
  applyMigrations?: boolean;
  createEncryptedBackup?: boolean;
}): Promise<{
  ok: boolean;
  checks: Record<string, unknown>;
}> {
  const checks: Record<string, unknown> = {
    executedAt: new Date().toISOString(),
  };

  // 1. Auth secret strength check (no secret value logged)
  const sessionSecretRaw = (process.env.AUTH_SESSION_SECRET || '').trim();
  const sessionCheck = validateSessionSecretStrength(sessionSecretRaw);
  checks.authSessionSecret =
    sessionCheck.valid === false
      ? { present: Boolean(sessionSecretRaw), valid: false, reason: sessionCheck.reason }
      : { present: true, valid: true };

  // 2. Capture pre-run local database.json SHA (never overwrite Neon with ephemeral container re-seed!)
  const liveExists = fs.existsSync(DEFAULT_SOURCE_DB_PATH);
  const preRunLiveSha = liveExists ? sha256File(DEFAULT_SOURCE_DB_PATH) : null;
  const backupExists = fs.existsSync(DEFAULT_BACKUP_DB_PATH);
  const backupSha = backupExists ? sha256File(DEFAULT_BACKUP_DB_PATH) : null;
  checks.localContainerState = {
    liveJsonExists: liveExists,
    preRunLiveSha,
    backupExists,
    backupMatchesExpectedBaseline: backupExists ? backupSha === EXPECTED_BASELINE_SHA256 : null,
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

    // 4. Optional zero-collision pre-check & Drizzle migration 0001 application on confirmed dev branch
    const preCollisions = await detectZeroCaseCollisionsInPg(pool1);
    if (options?.applyMigrations) {
      await runDrizzleMigrationsOnConfirmedDev(pool1, db1);
    }

    // 5. Verify all 19 tables, normalized unique indexes, non-negative CHECK constraints, and ordering indexes
    const [tableRows, indexRows, checkRows, drizzleMigRows] = await Promise.all([
      pool1.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        `
      ),
      pool1.query<{ indexname: string }>(
        `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY indexname
        `
      ),
      pool1.query<{ conname: string }>(
        `
        SELECT conname
        FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace
          AND contype = 'c'
        ORDER BY conname
        `
      ),
      pool1.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations`
      ),
    ]);

    const presentTables = tableRows.rows.map((r) => r.table_name);
    const missingTables = REQUIRED_PG_TABLES.filter((t) => !presentTables.includes(t));
    const presentIndexes = new Set(indexRows.rows.map((r) => r.indexname));
    const requiredHardeningIndexes = [
      'users_email_lower_unique',
      'users_username_norm_unique',
      'group_invitations_group_norm_user_unique',
      'group_join_requests_group_norm_user_unique',
      'lab_notes_user_saved_idx',
      'timeline_events_timestamp_idx',
      'recovery_snapshots_created_at_idx',
    ];
    const missingIndexes = requiredHardeningIndexes.filter((idx) => !presentIndexes.has(idx));
    const presentChecks = new Set(checkRows.rows.map((r) => r.conname));
    const requiredCheckConstraints = [
      'users_xp_nonnegative_chk',
      'users_streak_nonnegative_chk',
      'user_progress_xp_nonnegative_chk',
      'user_progress_streak_nonnegative_chk',
      'post_xp_daily_totals_nonnegative_chk',
    ];
    const missingCheckConstraints = requiredCheckConstraints.filter((c) => !presentChecks.has(c));
    const drizzleCount = Number(drizzleMigRows.rows[0]?.count ?? 0);

    checks.schemaMigrations = {
      preCollisions,
      requiredCount: REQUIRED_PG_TABLES.length,
      presentTablesCount: presentTables.length,
      missingTables,
      missingIndexes,
      missingCheckConstraints,
      drizzleAppliedMigrationsCount: drizzleCount,
    };

    // 6. Read-only verification of migrated 6-account baseline in Neon + baseline comparison vs local JSON
    const baselineIntegrity = await inspectMigratedNeonBaseline(db1);
    checks.migratedBaselineIntegrity = baselineIntegrity;

    const pgExport = await exportDbSchemaFromPostgres(db1);
    let baselineComparison: Record<string, unknown> = { skipped: true };
    let reseedOverwriteBlockedInImporter = false;
    if (liveExists) {
      const localJson = loadValidatedSourceJson(DEFAULT_SOURCE_DB_PATH);
      const cmp = compareSourceJsonWithPg(localJson.db, pgExport);
      const reseedGuard = detectReseededSeedOverwrite(localJson.db, pgExport);

      // Verify importer actively throws and blocks when attempting to import the 5-account re-seed JSON
      try {
        await importJsonToPostgres({
          pool: pool1,
          db: db1,
          sourceDb: localJson.db,
          sourceSha256: localJson.sha256,
          dryRun: false,
        });
      } catch (guardErr: any) {
        reseedOverwriteBlockedInImporter = String(guardErr?.message || '').includes('Refusing');
      }

      baselineComparison = {
        ...cmp,
        reseedGuard,
        reseedOverwriteBlockedInImporter,
      };
    }
    checks.baselineComparison = baselineComparison;

    // 7. Create/Verify Durable Off-Container Encrypted Backup in recovery_snapshots + Restore/Tamper Drill
    let createdBackupMeta: Record<string, unknown> | null = null;
    if (options?.createEncryptedBackup && sessionCheck.valid) {
      createdBackupMeta = await createAndStoreEncryptedNeonBackup(pool1, db1, sessionCheck.secret, {
        reason: 'phase-2.5p2b2-baseline-protection',
      });
    }
    const verifiedBackup = sessionCheck.valid
      ? await verifyLatestEncryptedNeonBackup(
          pool1,
          db1,
          sessionCheck.secret,
          (createdBackupMeta?.snapshotKey as string | undefined) || undefined
        )
      : { ok: false };

    // Verify AES-256-GCM tamper rejection + 0600 file export/restore round-trip in isolated temp dir
    let tamperRejected = false;
    let encryptedFileRoundTripOk = false;
    if (sessionCheck.valid) {
      const env = encryptRecoveryPayload(
        pgExport,
        {
          projectId: identity1.projectId,
          branchId: identity1.branchId,
          snapshotKey: 'tamper-drill',
        },
        sessionCheck.secret
      );
      const tampered = {
        ...env,
        ciphertext:
          (env.ciphertext.startsWith('ff') ? '00' : 'ff') + env.ciphertext.slice(2),
      };
      try {
        decryptRecoveryPayload(
          tampered,
          { projectId: identity1.projectId, branchId: identity1.branchId },
          sessionCheck.secret
        );
      } catch {
        tamperRejected = true;
      }

      const encTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-enc-drill-'));
      try {
        const encPath = path.join(encTmpDir, 'recovery-drill.cfa-backup.enc');
        writeEncryptedBackupFile(encPath, env);
        const mode = fs.statSync(encPath).mode & 0o777;
        const restored = readAndDecryptBackupFile(
          encPath,
          { projectId: identity1.projectId, branchId: identity1.branchId },
          sessionCheck.secret
        );
        encryptedFileRoundTripOk =
          mode === 0o600 &&
          restored.verifiedSummary.accountCount === 6 &&
          restored.verifiedSummary.aggregateXp === 7950 &&
          restored.verifiedSummary.completedLessonsCount === 9;
      } finally {
        fs.rmSync(encTmpDir, { recursive: true, force: true });
      }
    }
    checks.encryptedRecoveryBackup = {
      createdBackupMeta,
      verifiedLatestSnapshot: verifiedBackup,
      tamperRejected,
      encryptedFileRoundTripOk,
    };

    // 8. Dry-run validation & cutover guards (stale detection, parity gate, fail-closed PG, write freeze)
    const fixture = buildIsolatedVerificationFixture();
    const dryRun = await importJsonToPostgres({
      pool: pool1,
      db: db1,
      sourceDb: fixture,
      sourceSha256: '0'.repeat(64),
      dryRun: true,
    });
    checks.dryRunValidation = dryRun;

    const parityGate = await verifyCutoverParityGate(db1, {
      minAccounts: 6,
      minAggregateXp: 7950,
      minCompletedLessons: 9,
    });

    const staleFixture: DbSchema = JSON.parse(JSON.stringify(pgExport));
    staleFixture.accounts[0].user.xp = 99999;
    staleFixture.accounts[0].progress.xp = 99999;
    staleFixture.accounts[0].progress.updatedAt = '2020-01-01T00:00:00.000Z';
    const staleConflictCheck = detectSourceVsPgConflicts(staleFixture, pgExport);

    let failClosedEmptyUrlThrew = false;
    try {
      await assertPostgresStorageReadyOrFailClosed({ databaseUrl: '' });
    } catch {
      failClosedEmptyUrlThrew = true;
    }

    // Verify 503 + Retry-After maintenance write freeze middleware against live temporary Express app
    let freezeBlockOk = false;
    const freezeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-freeze-'));
    try {
      const freezeDbPath = path.join(freezeDir, 'database.json');
      writeBaselineFixtureCopy(freezeDbPath);
      let frozen = true;
      const { createApiApp } = await import('../server.ts');
      const freezeApp = createApiApp(freezeDbPath, {
        sessionSecret: 'freeze_test_secret_material_32_characters',
        maintenanceWriteFreeze: () => frozen,
      });
      const srv = await new Promise<http.Server>((resolve) => {
        const s = freezeApp.listen(0, '127.0.0.1', () => resolve(s));
      });
      try {
        const addr = srv.address() as { port: number };
        const baseUrl = `http://127.0.0.1:${addr.port}`;
        const client = new TestCookieClient(baseUrl);
        const readRes = await client.request('GET', '/api/posts');
        const blockedRes = await client.request('POST', '/api/auth/register', {
          email: 'freeze-blocked@test.local',
          username: 'FreezeBlocked',
          password: 'ValidFreezePass!2026',
        });
        frozen = false;
        const resumedRes = await client.request('POST', '/api/auth/register', {
          email: 'freeze-resumed@test.local',
          username: 'FreezeResumed',
          password: 'ValidFreezePass!2026',
        });
        freezeBlockOk =
          readRes.status === 200 &&
          blockedRes.status === 503 &&
          blockedRes.headers.get('retry-after') === '30' &&
          blockedRes.data?.maintenanceMode === true &&
          resumedRes.status === 201;
      } finally {
        await new Promise<void>((r) => srv.close(() => r()));
      }
    } finally {
      fs.rmSync(freezeDir, { recursive: true, force: true });
    }

    checks.cutoverGuards = {
      parityGate,
      staleTimestampAndDivergenceDetected:
        staleConflictCheck.hasConflicts && staleConflictCheck.isStaleSource,
      failClosedEmptyUrlThrew,
      maintenanceWriteFreeze503Ok: freezeBlockOk,
    };

    // 9. Isolated PostgreSQL transactional checks (rolled back safely so 6-account baseline stays 100% intact)
    let idempotentRoundTripOk = false;
    let duplicateEmailRejectedWith23505 = false;
    let caseInsensitiveEmailRejectedWith23505 = false;
    let caseInsensitiveUsernameRejectedWith23505 = false;
    let negativeXpRejectedWith23514 = false;
    let atomicXpSingleAwardOk = false;
    let rollbackCaught = false;

    const txClient = await pool1.connect();
    try {
      await assertConfirmedDevNeonBranch(txClient);
      await txClient.query('BEGIN');

      const upsertProbeFixture = async () => {
        for (const acc of fixture.accounts) {
          await txClient.query(
            `
            INSERT INTO users (id, email, username, password_hash, token_version, xp, streak, level, rank, completion, verified_topics, learning_profile)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              username = EXCLUDED.username,
              password_hash = EXCLUDED.password_hash,
              learning_profile = EXCLUDED.learning_profile
            `,
            [
              acc.user.id,
              acc.email,
              acc.user.username,
              acc.passwordHash,
              acc.tokenVersion ?? 1,
              acc.user.xp,
              acc.user.streak,
              acc.user.level,
              acc.user.rank,
              acc.user.completion,
              JSON.stringify(acc.user.verifiedTopics || []),
              JSON.stringify(acc.user.learningProfile ?? null),
            ]
          );
          await txClient.query(
            `
            INSERT INTO user_progress (user_id, schema_version, completed_lesson_ids, completed_exercise_ids, completed_quiz_lesson_ids, completed_homework_lesson_ids, legacy_completed_lesson_ids, xp, streak)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
            ON CONFLICT (user_id) DO UPDATE SET xp = EXCLUDED.xp
            `,
            [
              acc.user.id,
              acc.progress.schemaVersion ?? 2,
              JSON.stringify(acc.progress.completedLessonIds || []),
              JSON.stringify(acc.progress.completedExerciseIds || []),
              JSON.stringify(acc.progress.completedQuizLessonIds || []),
              JSON.stringify(acc.progress.completedHomeworkLessonIds || []),
              JSON.stringify(acc.progress.legacyCompletedLessonIds || []),
              acc.progress.xp,
              acc.progress.streak,
            ]
          );
        }
      };

      await upsertProbeFixture();
      await upsertProbeFixture();

      const probeCountRes = await txClient.query<{
        cnt: string;
        default_profile: unknown;
        custom_profile: unknown;
      }>(
        `
        SELECT
          (SELECT COUNT(*)::text FROM users WHERE id IN ('usr-verify-probe-a', 'usr-verify-probe-b')) AS cnt,
          (SELECT learning_profile FROM users WHERE id = 'usr-verify-probe-a') AS default_profile,
          (SELECT learning_profile FROM users WHERE id = 'usr-verify-probe-b') AS custom_profile
        `
      );
      idempotentRoundTripOk =
        Number(probeCountRes.rows[0]?.cnt) === 2 &&
        isDeepStrictEqual(
          probeCountRes.rows[0]?.default_profile,
          fixture.accounts[0].user.learningProfile
        ) &&
        isDeepStrictEqual(
          probeCountRes.rows[0]?.custom_profile,
          fixture.accounts[1].user.learningProfile
        );

      // Exact duplicate email -> 23505
      await txClient.query('SAVEPOINT dup_exact_email');
      try {
        await txClient.query(
          `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
          ['usr-verify-dup-1', fixture.accounts[0].email, '@DupTmp1', fixture.accounts[0].passwordHash]
        );
      } catch (e: any) {
        duplicateEmailRejectedWith23505 = (e?.code ?? e?.cause?.code) === '23505';
        await txClient.query('ROLLBACK TO SAVEPOINT dup_exact_email');
      }

      // Case-insensitive duplicate email -> 23505 via users_email_lower_unique
      await txClient.query('SAVEPOINT dup_lower_email');
      try {
        await txClient.query(
          `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
          [
            'usr-verify-dup-2',
            fixture.accounts[0].email.toUpperCase(),
            '@DupTmp2',
            fixture.accounts[0].passwordHash,
          ]
        );
      } catch (e: any) {
        caseInsensitiveEmailRejectedWith23505 = (e?.code ?? e?.cause?.code) === '23505';
        await txClient.query('ROLLBACK TO SAVEPOINT dup_lower_email');
      }

      // Normalized case/@-insensitive duplicate username -> 23505 via users_username_norm_unique
      await txClient.query('SAVEPOINT dup_norm_user');
      try {
        await txClient.query(
          `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
          ['usr-verify-dup-3', 'dup3@example.invalid', 'verifyprobea', fixture.accounts[0].passwordHash]
        );
      } catch (e: any) {
        caseInsensitiveUsernameRejectedWith23505 = (e?.code ?? e?.cause?.code) === '23505';
        await txClient.query('ROLLBACK TO SAVEPOINT dup_norm_user');
      }

      // Negative XP CHECK constraint -> 23514
      await txClient.query('SAVEPOINT neg_xp_chk');
      try {
        await txClient.query(`UPDATE users SET xp = -50 WHERE id = 'usr-verify-probe-a'`);
      } catch (e: any) {
        negativeXpRejectedWith23514 = (e?.code ?? e?.cause?.code) === '23514';
        await txClient.query('ROLLBACK TO SAVEPOINT neg_xp_chk');
      }

      // Atomic duplicate-XP-event prevention (single award across replay inside transaction)
      const firstAward = await atomicAwardXpEventPg(txClient, {
        userId: 'usr-verify-probe-a',
        eventId: 'submit_quiz:boot-os',
        xpDelta: 400,
        manageTransaction: false,
      });
      const secondAward = await atomicAwardXpEventPg(txClient, {
        userId: 'usr-verify-probe-a',
        eventId: 'submit_quiz:boot-os',
        xpDelta: 400,
        manageTransaction: false,
      });
      atomicXpSingleAwardOk =
        firstAward.awarded === true &&
        firstAward.newXp === 850 &&
        secondAward.awarded === false &&
        secondAward.newXp === 850;

      throw new Error('INTENTIONAL_ROLLBACK_TEST');
    } catch (err: any) {
      if (String(err?.message).includes('INTENTIONAL_ROLLBACK_TEST')) {
        rollbackCaught = true;
      } else {
        throw err;
      }
    } finally {
      await txClient.query('ROLLBACK').catch(() => {});
      txClient.release();
    }

    const probeAfterRollback = await db1
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        inArray(schema.users.id, [
          'usr-verify-probe-a',
          'usr-verify-probe-b',
          'usr-verify-dup-1',
          'usr-verify-dup-2',
          'usr-verify-dup-3',
        ])
      );

    checks.isolatedTransactionalChecks = {
      idempotentRoundTripOk,
      duplicateEmailRejectedWith23505,
      caseInsensitiveEmailRejectedWith23505,
      caseInsensitiveUsernameRejectedWith23505,
      negativeXpRejectedWith23514,
      atomicXpSingleAwardOk,
      intentionalErrorCaught: rollbackCaught,
      probeRowsSurvivingAfterRollback: probeAfterRollback.length,
      rollbackClean: rollbackCaught && probeAfterRollback.length === 0,
    };
  } finally {
    await pool1.end();
  }

  // 10. Persistence after database reconnection (fresh pool)
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
    const postReconnectBaseline = await inspectMigratedNeonBaseline(db2);
    checks.postReconnectPersistence = {
      reconnectedBranchId: identity2.branchId,
      reconnectedProjectId: identity2.projectId,
      baselineIntact: postReconnectBaseline.ok,
      counts: postReconnectBaseline.counts,
      aggregateXp: postReconnectBaseline.aggregateXp,
      completedLessonsCount: postReconnectBaseline.completedLessonsCount,
    };
  } finally {
    await pool2.end();
  }

  // 11. Server-only database, migration, and encrypted backup isolation audit
  const dbSensitivePaths = [
    '/src/db/client.ts',
    '/src/db/schema.ts',
    '/src/db%2fclient.ts',
    '/@id/src/db/client.ts',
    '/src/server/recoveryBackup.ts',
    '/src/server/cutoverGuard.ts',
    '/drizzle.config.ts',
    '/drizzle/0000_groovy_mister_fear.sql',
    '/drizzle/0001_baseline_hardening_and_recovery.sql',
    '/drizzle/meta/_journal.json',
    '/drizzle/meta/0001_snapshot.json',
    '/scripts/migrateJsonToPostgres.ts',
    '/scripts/verifyPhase2_5P2B.ts',
    '/recovery-export.cfa-backup.enc',
    '/database.json',
    '/.env',
    '/.env.example',
  ];
  const unblockedInDev = dbSensitivePaths.filter((p) => !isBlockedAppPath(p, 'dev'));
  const unblockedInProd = dbSensitivePaths.filter((p) => !isBlockedAppPath(p, 'prod'));

  const frontendViolations: string[] = [];
  const walkSrc = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
      if (rel === 'src/server' || rel === 'src/db') continue;
      if (ent.isDirectory()) walkSrc(full);
      else if (ent.isFile() && /\.(ts|tsx|js|jsx)$/.test(ent.name)) {
        const txt = fs.readFileSync(full, 'utf-8');
        if (/drizzle-orm|from\s+['"]pg['"]|src\/db|DATABASE_URL|recovery_snapshots/.test(txt)) {
          frontendViolations.push(rel);
        }
      }
    }
  };
  walkSrc(path.join(process.cwd(), 'src'));

  const distClientDir = path.join(process.cwd(), 'dist', 'client');
  const bundleViolations: string[] = [];
  let scannedBundleFiles = 0;
  if (fs.existsSync(distClientDir)) {
    const walkDist = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walkDist(full);
        else if (ent.isFile() && /\.(js|html)$/.test(ent.name)) {
          scannedBundleFiles++;
          const txt = fs.readFileSync(full, 'utf-8');
          for (const tok of [
            'DATABASE_URL',
            'AUTH_SESSION_SECRET',
            'rough-salad-06707647',
            'br-little-brook-azw0rzn0',
            'ep-autumn-bread-aztnyc2j',
            'drizzle-orm',
            'postgres://',
            'postgresql://',
            'scrypt$',
          ]) {
            if (txt.includes(tok)) {
              bundleViolations.push(`${path.basename(full)}:${tok}`);
            }
          }
        }
      }
    };
    walkDist(distClientDir);
  }

  checks.databaseIsolation = {
    unblockedInDev,
    unblockedInProd,
    frontendViolations,
    scannedBundleFiles,
    bundleViolations,
    isolated:
      unblockedInDev.length === 0 &&
      unblockedInProd.length === 0 &&
      frontendViolations.length === 0 &&
      bundleViolations.length === 0,
  };

  // 12. Confirm local database.json was completely untouched by this run
  const postRunLiveSha = liveExists ? sha256File(DEFAULT_SOURCE_DB_PATH) : null;
  checks.sourceJsonPreservedAfterAllChecks = {
    preRunLiveSha,
    postRunLiveSha,
    liveUnchangedDuringRun: postRunLiveSha === preRunLiveSha,
  };

  const sm = checks.schemaMigrations as any;
  const enc = checks.encryptedRecoveryBackup as any;
  const cg = checks.cutoverGuards as any;
  const itc = checks.isolatedTransactionalChecks as any;

  const ok =
    Boolean((checks.authSessionSecret as any)?.valid) &&
    Boolean(sm?.preCollisions?.ok) &&
    (sm?.missingTables?.length ?? 1) === 0 &&
    (sm?.missingIndexes?.length ?? 1) === 0 &&
    (sm?.missingCheckConstraints?.length ?? 1) === 0 &&
    Boolean((checks.migratedBaselineIntegrity as any)?.ok) &&
    Boolean((checks.baselineComparison as any)?.reseedOverwriteBlockedInImporter ?? true) &&
    Boolean(enc?.verifiedLatestSnapshot?.ok) &&
    Boolean(enc?.tamperRejected) &&
    Boolean(enc?.encryptedFileRoundTripOk) &&
    Boolean((checks.dryRunValidation as any)?.dryRun) &&
    Boolean(cg?.parityGate?.ok) &&
    Boolean(cg?.staleTimestampAndDivergenceDetected) &&
    Boolean(cg?.failClosedEmptyUrlThrew) &&
    Boolean(cg?.maintenanceWriteFreeze503Ok) &&
    Boolean(itc?.idempotentRoundTripOk) &&
    Boolean(itc?.duplicateEmailRejectedWith23505) &&
    Boolean(itc?.caseInsensitiveEmailRejectedWith23505) &&
    Boolean(itc?.caseInsensitiveUsernameRejectedWith23505) &&
    Boolean(itc?.negativeXpRejectedWith23514) &&
    Boolean(itc?.atomicXpSingleAwardOk) &&
    Boolean(itc?.rollbackClean) &&
    Boolean((checks.postReconnectPersistence as any)?.baselineIntact) &&
    Boolean((checks.databaseIsolation as any)?.isolated) &&
    Boolean((checks.sourceJsonPreservedAfterAllChecks as any)?.liveUnchangedDuringRun);

  const finalResult = { ok, checks };
  if (options?.outputPath) {
    fs.writeFileSync(options.outputPath, JSON.stringify(finalResult, null, 2), { mode: 0o600 });
  }
  return finalResult;
}

const isMainEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('verifyPhase2_5P2B');

if (isMainEntry) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;
  const applyMigrations = args.includes('--apply-migrations');
  const createEncryptedBackup = args.includes('--create-encrypted-backup');

  runPhase25P2BVerification({
    outputPath: outPath,
    applyMigrations,
    createEncryptedBackup,
  })
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
