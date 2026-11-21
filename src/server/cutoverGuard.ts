import { isDeepStrictEqual } from 'util';
import type { NextFunction, Request, Response } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';
import * as schema from '../db/schema.ts';
import {
  assertConfirmedDevNeonBranch,
  createNeonPool,
  redactPgSecrets,
} from '../db/client.ts';
import { isScryptHash } from './auth.ts';
import { normalizeHandle } from './groups.ts';
import { DbSchema } from './migration.ts';
import { exportDbSchemaFromPostgres } from './recoveryBackup.ts';

export const SEED_OPERATOR_IDS = ['usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005'] as const;

export const REQUIRED_PG_TABLES = [
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
  'recovery_snapshots',
] as const;

export interface SourceVsPgComparison {
  jsonAccountsCount: number;
  pgAccountsCount: number;
  jsonAggregateXp: number;
  pgAggregateXp: number;
  jsonCompletedLessons: number;
  pgCompletedLessons: number;
  jsonLabNotesCount: number;
  pgLabNotesCount: number;
  jsonPostsCount: number;
  pgPostsCount: number;
  jsonGroupsCount: number;
  pgGroupsCount: number;
  jsonGroupMessagesCount: number;
  pgGroupMessagesCount: number;
  jsonTimelineEventsCount: number;
  pgTimelineEventsCount: number;
  missingInJsonUserIds: string[];
  extraInJsonUserIds: string[];
  extraInJsonPostIds: string[];
  extraInJsonGroupIds: string[];
  extraInJsonGroupMessageIds: string[];
  extraInJsonTimelineEventIds: string[];
  accountProgressAdvancesInJson: string[];
  accountProfileOrNotesDivergences: string[];
  reseedDetected: boolean;
  newerLegitimateActivityInJson: boolean;
  pgIsAuthoritativeBaseline: boolean;
}

function totalXp(db: DbSchema): number {
  return (db.accounts || []).reduce((sum, a) => sum + (a.progress?.xp ?? a.user?.xp ?? 0), 0);
}

function totalCompletedLessons(db: DbSchema): number {
  return (db.accounts || []).reduce(
    (sum, a) => sum + (a.progress?.completedLessonIds?.length ?? 0),
    0
  );
}

function totalGroupMessages(db: DbSchema): number {
  return (db.groups || []).reduce((sum, g) => sum + (g.messages?.length ?? 0), 0);
}

function totalLabNotes(db: DbSchema): number {
  return (db.accounts || []).reduce((sum, a) => sum + (a.labNotes?.length ?? 0), 0);
}

export function compareSourceJsonWithPg(
  sourceDb: DbSchema,
  pgDb: DbSchema
): SourceVsPgComparison {
  const jsonAccounts = sourceDb.accounts || [];
  const pgAccounts = pgDb.accounts || [];

  const jsonUserById = new Map(jsonAccounts.map((a) => [a.user.id, a]));
  const pgUserById = new Map(pgAccounts.map((a) => [a.user.id, a]));

  const missingInJsonUserIds = pgAccounts
    .filter((a) => !jsonUserById.has(a.user.id))
    .map((a) => a.user.id);
  const extraInJsonUserIds = jsonAccounts
    .filter((a) => !pgUserById.has(a.user.id))
    .map((a) => a.user.id);

  const pgPostIds = new Set((pgDb.posts || []).map((p) => p.id));
  const extraInJsonPostIds = (sourceDb.posts || [])
    .filter((p) => !pgPostIds.has(p.id))
    .map((p) => p.id);

  const pgGroupIds = new Set((pgDb.groups || []).map((g) => g.id));
  const extraInJsonGroupIds = (sourceDb.groups || [])
    .filter((g) => !pgGroupIds.has(g.id))
    .map((g) => g.id);

  const pgMsgIds = new Set((pgDb.groups || []).flatMap((g) => (g.messages || []).map((m) => m.id)));
  const extraInJsonGroupMessageIds = (sourceDb.groups || [])
    .flatMap((g) => g.messages || [])
    .filter((m) => !pgMsgIds.has(m.id))
    .map((m) => m.id);

  const pgTimelineIds = new Set((pgDb.timelineEvents || []).map((t) => t.id));
  const extraInJsonTimelineEventIds = (sourceDb.timelineEvents || [])
    .filter((t) => !pgTimelineIds.has(t.id))
    .map((t) => t.id);

  const accountProgressAdvancesInJson: string[] = [];
  const accountProfileOrNotesDivergences: string[] = [];

  for (const jsonAcc of jsonAccounts) {
    const pgAcc = pgUserById.get(jsonAcc.user.id);
    if (!pgAcc) continue;

    const jsonXp = jsonAcc.progress?.xp ?? jsonAcc.user?.xp ?? 0;
    const pgXp = pgAcc.progress?.xp ?? pgAcc.user?.xp ?? 0;
    const jsonLessons = new Set(jsonAcc.progress?.completedLessonIds || []);
    const pgLessons = new Set(pgAcc.progress?.completedLessonIds || []);
    const hasNewLessonInJson = [...jsonLessons].some((id) => !pgLessons.has(id));
    const jsonNoteIds = new Set((jsonAcc.labNotes || []).map((n) => n.id));
    const pgNoteIds = new Set((pgAcc.labNotes || []).map((n) => n.id));
    const hasNewNoteInJson = [...jsonNoteIds].some((id) => !pgNoteIds.has(id));

    if (jsonXp > pgXp || hasNewLessonInJson || hasNewNoteInJson) {
      accountProgressAdvancesInJson.push(jsonAcc.user.id);
    }

    if (
      !isDeepStrictEqual(jsonAcc.user.learningProfile ?? null, pgAcc.user.learningProfile ?? null) ||
      jsonAcc.labNotes.length !== pgAcc.labNotes.length
    ) {
      accountProfileOrNotesDivergences.push(jsonAcc.user.id);
    }
  }

  const jsonAccountsCount = jsonAccounts.length;
  const pgAccountsCount = pgAccounts.length;
  const jsonAggregateXp = totalXp(sourceDb);
  const pgAggregateXp = totalXp(pgDb);
  const jsonCompletedLessons = totalCompletedLessons(sourceDb);
  const pgCompletedLessons = totalCompletedLessons(pgDb);

  const newerLegitimateActivityInJson =
    extraInJsonUserIds.length > 0 ||
    extraInJsonPostIds.length > 0 ||
    extraInJsonGroupIds.length > 0 ||
    extraInJsonGroupMessageIds.length > 0 ||
    extraInJsonTimelineEventIds.length > 0 ||
    accountProgressAdvancesInJson.length > 0;

  const isSeedFiveAccounts =
    jsonAccountsCount === SEED_OPERATOR_IDS.length &&
    SEED_OPERATOR_IDS.every((id) => jsonUserById.has(id));

  const reseedDetected =
    pgAccountsCount > jsonAccountsCount &&
    missingInJsonUserIds.length > 0 &&
    !newerLegitimateActivityInJson &&
    isSeedFiveAccounts;

  return {
    jsonAccountsCount,
    pgAccountsCount,
    jsonAggregateXp,
    pgAggregateXp,
    jsonCompletedLessons,
    pgCompletedLessons,
    jsonLabNotesCount: totalLabNotes(sourceDb),
    pgLabNotesCount: totalLabNotes(pgDb),
    jsonPostsCount: (sourceDb.posts || []).length,
    pgPostsCount: (pgDb.posts || []).length,
    jsonGroupsCount: (sourceDb.groups || []).length,
    pgGroupsCount: (pgDb.groups || []).length,
    jsonGroupMessagesCount: totalGroupMessages(sourceDb),
    pgGroupMessagesCount: totalGroupMessages(pgDb),
    jsonTimelineEventsCount: (sourceDb.timelineEvents || []).length,
    pgTimelineEventsCount: (pgDb.timelineEvents || []).length,
    missingInJsonUserIds,
    extraInJsonUserIds,
    extraInJsonPostIds,
    extraInJsonGroupIds,
    extraInJsonGroupMessageIds,
    extraInJsonTimelineEventIds,
    accountProgressAdvancesInJson,
    accountProfileOrNotesDivergences,
    reseedDetected,
    newerLegitimateActivityInJson,
    pgIsAuthoritativeBaseline: pgAccountsCount >= jsonAccountsCount && !newerLegitimateActivityInJson,
  };
}

export function detectReseededSeedOverwrite(
  sourceDb: DbSchema,
  pgDb: DbSchema
): {
  blocked: boolean;
  reason: string;
  missingInSourceUserIds: string[];
  seedPatternDetected: boolean;
} {
  const cmp = compareSourceJsonWithPg(sourceDb, pgDb);
  const seedPatternDetected =
    cmp.jsonAccountsCount === SEED_OPERATOR_IDS.length &&
    SEED_OPERATOR_IDS.every((id) => (sourceDb.accounts || []).some((a) => a.user.id === id));

  if (cmp.reseedDetected) {
    return {
      blocked: true,
      reason: `Refusing import: source JSON appears to be the re-seeded 5-account runtime file (${cmp.jsonAccountsCount} accounts) missing authoritative PostgreSQL accounts (${cmp.missingInJsonUserIds.join(', ')}).`,
      missingInSourceUserIds: cmp.missingInJsonUserIds,
      seedPatternDetected,
    };
  }

  if (cmp.missingInJsonUserIds.length > 0) {
    return {
      blocked: true,
      reason: `Refusing overwrite: PostgreSQL contains ${cmp.missingInJsonUserIds.length} account(s) absent from source JSON (${cmp.missingInJsonUserIds.join(', ')}).`,
      missingInSourceUserIds: cmp.missingInJsonUserIds,
      seedPatternDetected,
    };
  }

  if (cmp.pgAggregateXp > cmp.jsonAggregateXp) {
    return {
      blocked: true,
      reason: `Refusing regression: PostgreSQL aggregate XP (${cmp.pgAggregateXp}) exceeds source JSON (${cmp.jsonAggregateXp}).`,
      missingInSourceUserIds: cmp.missingInJsonUserIds,
      seedPatternDetected,
    };
  }

  if (cmp.pgCompletedLessons > cmp.jsonCompletedLessons) {
    return {
      blocked: true,
      reason: `Refusing regression: PostgreSQL completed lessons (${cmp.pgCompletedLessons}) exceeds source JSON (${cmp.jsonCompletedLessons}).`,
      missingInSourceUserIds: cmp.missingInJsonUserIds,
      seedPatternDetected,
    };
  }

  return {
    blocked: false,
    reason: 'No re-seeded downgrade detected.',
    missingInSourceUserIds: [],
    seedPatternDetected,
  };
}

export function detectSourceVsPgConflicts(
  sourceDb: DbSchema,
  pgDb: DbSchema
): {
  hasConflicts: boolean;
  isStaleSource: boolean;
  staleUserIds: string[];
  divergentUserIds: string[];
  missingInSourceUserIds: string[];
  extraInSourceUserIds: string[];
  reasons: string[];
} {
  const srcById = new Map((sourceDb.accounts || []).map((a) => [a.user.id, a]));
  const pgById = new Map((pgDb.accounts || []).map((a) => [a.user.id, a]));

  const staleUserIds: string[] = [];
  const divergentUserIds: string[] = [];
  const missingInSourceUserIds = (pgDb.accounts || [])
    .filter((a) => !srcById.has(a.user.id))
    .map((a) => a.user.id);
  const extraInSourceUserIds = (sourceDb.accounts || [])
    .filter((a) => !pgById.has(a.user.id))
    .map((a) => a.user.id);
  const reasons: string[] = [];

  if (missingInSourceUserIds.length > 0) {
    reasons.push(`Missing PG account(s) in source: ${missingInSourceUserIds.join(', ')}`);
  }

  for (const srcAcc of sourceDb.accounts || []) {
    const pgAcc = pgById.get(srcAcc.user.id);
    if (!pgAcc) continue;

    const srcXp = srcAcc.progress?.xp ?? srcAcc.user?.xp ?? 0;
    const pgXp = pgAcc.progress?.xp ?? pgAcc.user?.xp ?? 0;
    const srcLessons = [...(srcAcc.progress?.completedLessonIds || [])].sort();
    const pgLessons = [...(pgAcc.progress?.completedLessonIds || [])].sort();

    const payloadDiffers =
      srcXp !== pgXp ||
      (srcAcc.user.streak ?? 0) !== (pgAcc.user.streak ?? 0) ||
      srcAcc.passwordHash !== pgAcc.passwordHash ||
      !isDeepStrictEqual(srcLessons, pgLessons) ||
      !isDeepStrictEqual(srcAcc.user.learningProfile ?? null, pgAcc.user.learningProfile ?? null);

    if (payloadDiffers) {
      divergentUserIds.push(srcAcc.user.id);
      reasons.push(`Divergent state for account ${srcAcc.user.id}`);
    }

    const srcUpdatedMs = Date.parse(srcAcc.progress?.updatedAt || srcAcc.user.lastActiveTimestamp || '');
    const pgUpdatedMs = Date.parse(pgAcc.progress?.updatedAt || pgAcc.user.lastActiveTimestamp || '');

    if (Number.isFinite(srcUpdatedMs) && Number.isFinite(pgUpdatedMs) && srcUpdatedMs < pgUpdatedMs) {
      staleUserIds.push(srcAcc.user.id);
      reasons.push(`Source timestamp for ${srcAcc.user.id} is older than PostgreSQL timestamp`);
    }
  }

  const isStaleSource = staleUserIds.length > 0 || missingInSourceUserIds.length > 0;
  const hasConflicts = isStaleSource || divergentUserIds.length > 0;

  return {
    hasConflicts,
    isStaleSource,
    staleUserIds,
    divergentUserIds,
    missingInSourceUserIds,
    extraInSourceUserIds,
    reasons,
  };
}

export async function verifyCutoverParityGate(
  db: NodePgDatabase<typeof schema>,
  options?: {
    minAccounts?: number;
    minAggregateXp?: number;
    minCompletedLessons?: number;
  }
): Promise<{
  ok: boolean;
  accountsCount: number;
  aggregateXp: number;
  completedLessonsCount: number;
  scryptHashesCount: number;
  failures: string[];
}> {
  const exported = await exportDbSchemaFromPostgres(db);
  const failures: string[] = [];

  const minAccounts = options?.minAccounts ?? 6;
  const minAggregateXp = options?.minAggregateXp ?? 7950;
  const minCompletedLessons = options?.minCompletedLessons ?? 9;

  const emailLowerSet = new Set<string>();
  const usernameNormSet = new Set<string>();

  let scryptHashesCount = 0;
  let aggregateXp = 0;
  let completedLessonsCount = 0;

  for (const acc of exported.accounts) {
    if (!isScryptHash(acc.passwordHash)) {
      failures.push(`Account ${acc.user.id} lacks a valid scrypt hash`);
    } else {
      scryptHashesCount++;
    }

    const emailKey = acc.email.trim().toLowerCase();
    if (emailLowerSet.has(emailKey)) {
      failures.push(`Case-insensitive duplicate email detected: ${emailKey}`);
    }
    emailLowerSet.add(emailKey);

    const handleKey = normalizeHandle(acc.user.username);
    if (usernameNormSet.has(handleKey)) {
      failures.push(`Case-insensitive duplicate handle detected: ${handleKey}`);
    }
    usernameNormSet.add(handleKey);

    if (acc.user.xp !== acc.progress.xp) {
      failures.push(`XP parity mismatch between users and user_progress for ${acc.user.id}`);
    }
    if (acc.user.streak !== acc.progress.streak) {
      failures.push(`Streak parity mismatch between users and user_progress for ${acc.user.id}`);
    }
    if (acc.user.xp < 0 || acc.user.streak < 0 || acc.progress.xp < 0 || acc.progress.streak < 0) {
      failures.push(`Negative XP or streak detected for ${acc.user.id}`);
    }

    aggregateXp += acc.progress.xp;
    completedLessonsCount += acc.progress.completedLessonIds.length;
  }

  if (exported.accounts.length < minAccounts) {
    failures.push(`Account count ${exported.accounts.length} below required floor ${minAccounts}`);
  }
  if (aggregateXp < minAggregateXp) {
    failures.push(`Aggregate XP ${aggregateXp} below required floor ${minAggregateXp}`);
  }
  if (completedLessonsCount < minCompletedLessons) {
    failures.push(
      `Completed lessons ${completedLessonsCount} below required floor ${minCompletedLessons}`
    );
  }

  return {
    ok: failures.length === 0,
    accountsCount: exported.accounts.length,
    aggregateXp,
    completedLessonsCount,
    scryptHashesCount,
    failures,
  };
}

export async function assertPostgresStorageReadyOrFailClosed(options?: {
  pool?: Pool;
  databaseUrl?: string;
  skipBranchCheck?: boolean;
}): Promise<{
  ready: true;
  projectId: string | null;
  branchId: string | null;
  tableCount: number;
}> {
  const rawUrl = (options?.databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
  if (!rawUrl && !options?.pool) {
    throw new Error(
      'Fail-closed: DATABASE_URL is not configured for PostgreSQL storage cutover; refusing silent JSON fallback.'
    );
  }

  const ownPool = !options?.pool;
  const activePool = options?.pool ?? createNeonPool(rawUrl);

  try {
    const client = await activePool.connect();
    try {
      let projectId: string | null = null;
      let branchId: string | null = null;

      if (!options?.skipBranchCheck) {
        const identity = await assertConfirmedDevNeonBranch(client, rawUrl || undefined);
        projectId = identity.projectId;
        branchId = identity.branchId;
      }

      const tableRes = await client.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        `
      );
      const present = new Set(tableRes.rows.map((r) => r.table_name));
      const missing = REQUIRED_PG_TABLES.filter((t) => !present.has(t));
      if (missing.length > 0) {
        throw new Error(
          `Fail-closed: PostgreSQL schema incomplete; missing required tables: ${missing.join(', ')}.`
        );
      }

      return {
        ready: true,
        projectId,
        branchId,
        tableCount: present.size,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    throw new Error(redactPgSecrets(String(err?.message || err)));
  } finally {
    if (ownPool) {
      await activePool.end().catch(() => {});
    }
  }
}

export function createMaintenanceWriteFreezeMiddleware(isFrozen: () => boolean) {
  const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  return (req: Request, res: Response, next: NextFunction) => {
    if (isFrozen() && MUTATING_METHODS.has(req.method.toUpperCase())) {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({
        error:
          'Academy database maintenance cutover is temporarily in progress. Read access remains available; please retry your update shortly.',
        maintenanceMode: true,
      });
    }
    return next();
  };
}

/**
 * Concurrency-safe, atomic XP event award helper for PostgreSQL cutover readiness.
 * Prevents concurrent duplicate XP farming via PK `(user_id, event_id)` and keeps
 * `users` and `user_progress` XP columns strictly synchronized inside the transaction.
 */
export async function atomicAwardXpEventPg(
  client: PoolClient,
  input: { userId: string; eventId: string; xpDelta: number; manageTransaction?: boolean }
): Promise<{ awarded: boolean; newXp: number }> {
  if (!Number.isFinite(input.xpDelta) || input.xpDelta < 0) {
    throw new Error('xpDelta must be a non-negative finite number.');
  }
  const safeDelta = Math.floor(input.xpDelta);
  const manageTx = input.manageTransaction !== false;
  const nowIso = new Date().toISOString();

  if (manageTx) {
    await client.query('BEGIN');
  }
  try {
    const insertEv = await client.query<{ event_id: string }>(
      `
      INSERT INTO xp_events (user_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, event_id) DO NOTHING
      RETURNING event_id
      `,
      [input.userId, input.eventId]
    );

    if (insertEv.rowCount === 0) {
      const curRes = await client.query<{ xp: number }>(
        `SELECT xp FROM user_progress WHERE user_id = $1`,
        [input.userId]
      );
      if (manageTx) await client.query('COMMIT');
      return { awarded: false, newXp: curRes.rows[0]?.xp ?? 0 };
    }

    const updatedUser = await client.query<{ xp: number }>(
      `
      UPDATE users
      SET xp = xp + $2, updated_at = NOW()
      WHERE id = $1
      RETURNING xp
      `,
      [input.userId, safeDelta]
    );

    if (updatedUser.rowCount === 0) {
      throw new Error(`Cannot award XP: user ${input.userId} does not exist.`);
    }

    const updatedProgress = await client.query<{ xp: number }>(
      `
      UPDATE user_progress
      SET xp = xp + $2, updated_at = $3
      WHERE user_id = $1
      RETURNING xp
      `,
      [input.userId, safeDelta, nowIso]
    );

    if (updatedProgress.rowCount === 0 || updatedProgress.rows[0].xp !== updatedUser.rows[0].xp) {
      throw new Error(`XP parity mismatch after update for user ${input.userId}.`);
    }

    if (manageTx) {
      await client.query('COMMIT');
    }
    return { awarded: true, newXp: updatedProgress.rows[0].xp };
  } catch (err) {
    if (manageTx) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  }
}
