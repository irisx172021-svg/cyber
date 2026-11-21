import crypto from 'crypto';
import type { Pool, PoolClient } from 'pg';
import {
  assertConfirmedDevNeonBranch,
  CONFIRMED_DEV_NEON_BRANCH_ID,
  CONFIRMED_DEV_NEON_ENDPOINT_PREFIX,
  createNeonPool,
  redactPgSecrets,
} from '../db/client.ts';
import { ACADEMY_CURRICULUM } from '../data/curriculum.ts';
import { CURRENT_PROGRESS_SCHEMA_VERSION } from '../data/curriculumMetadata.ts';
import { indexCurriculumLessons } from '../lib/curriculumProgress.ts';
import {
  normalizeLearningProfile,
  validateLearningProfileUpdate,
} from '../lib/learningProfile.ts';
import type {
  CapstoneAccountProgress,
  CapstoneProgressMap,
  CommunityPost,
  Group,
  GroupInvitation,
  GroupJoinRequest,
  GroupMessage,
  LabExplorationMap,
  LabExplorationProgress,
  LabNote,
  LearningProfile,
  PersistedCommunityPost,
  TimelineEvent,
  User,
  UserProgress,
} from '../types';
import {
  getSanitizedLabExplorationForUser,
  processLabExplorationStep,
  recordVerifiedLogInvestigation,
  verifyLogInvestigationTarget,
} from './assessments.ts';
import {
  DUMMY_SCRYPT_HASH,
  sanitizeSelfUser,
  toPublicDirectoryUser,
} from './auth.ts';
import {
  getSanitizedCapstoneProgressForUser,
  processCapstoneEvidenceVerification,
  processCapstoneReportSubmission,
  processCapstoneStageCheck,
} from './capstones.ts';
import { assertPostgresStorageReadyOrFailClosed } from './cutoverGuard.ts';
import {
  addMemberDeduplicated,
  createGroupInvitationRecord,
  createJoinRequestRecord,
  isGroupMember,
  isGroupOwner,
  normalizeHandle,
  pruneExpiredInvitations,
  sanitizeGroupForUser,
  sanitizeGroupMessage,
} from './groups.ts';
import {
  AccountRecord,
  applyEngagementMutation,
  applyPostCreationXp,
  applySafeProgressSync,
  EngagementInput,
} from './migration.ts';
import { deriveForumRoleFromRank, sanitizePostForClient } from './security.ts';

export type StorageBackend = 'json' | 'postgres';

export function resolveStorageBackend(options?: {
  explicitBackend?: StorageBackend;
  hasExplicitDbPath?: boolean;
  envBackend?: string | undefined;
}): StorageBackend {
  if (options?.explicitBackend !== undefined) {
    if (options.explicitBackend !== 'json' && options.explicitBackend !== 'postgres') {
      throw new Error(
        `Fail-closed: Invalid explicit storageBackend "${String(options.explicitBackend)}". Expected "json" or "postgres".`
      );
    }
    return options.explicitBackend;
  }

  const rawEnv = (options?.envBackend ?? process.env.STORAGE_BACKEND ?? '').trim().toLowerCase();
  if (rawEnv === 'postgres') {
    return 'postgres';
  }
  if (rawEnv === 'json') {
    return 'json';
  }
  if (rawEnv !== '') {
    throw new Error(
      `Fail-closed: Invalid STORAGE_BACKEND="${rawEnv}". Expected "json" or "postgres".`
    );
  }

  // Preserve isolated temporary JSON test execution when tests pass a specific tmp dbPath
  if (options?.hasExplicitDbPath) {
    return 'json';
  }

  return 'json';
}

export class PgStorageUnavailableError extends Error {
  constructor(message = 'Database service temporarily unavailable.') {
    super(message);
    this.name = 'PgStorageUnavailableError';
  }
}

function isPgConnectionOrInfraError(err: any): boolean {
  if (err instanceof PgStorageUnavailableError) return true;
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code.startsWith('08') ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    msg.includes('pool') ||
    msg.includes('connection terminated') ||
    msg.includes('cannot use a pool after calling end') ||
    msg.includes('timeout exceeded when trying to connect') ||
    msg.includes('database_url is missing') ||
    msg.includes('fail-closed:')
  );
}

function sanitizePostCategory(raw: string): PersistedCommunityPost['category'] {
  const valid: PersistedCommunityPost['category'][] = [
    'General',
    'Help',
    'Defensive',
    'Offensive',
    'Certifications',
  ];
  return valid.includes(raw as PersistedCommunityPost['category'])
    ? (raw as PersistedCommunityPost['category'])
    : 'General';
}

function sanitizeAuthorRole(raw: string): PersistedCommunityPost['authorRole'] {
  const valid: PersistedCommunityPost['authorRole'][] = [
    'Cadet',
    'Operator',
    'Infiltrator',
    'Instructor',
  ];
  return valid.includes(raw as PersistedCommunityPost['authorRole'])
    ? (raw as PersistedCommunityPost['authorRole'])
    : 'Cadet';
}

function resolveLessonTitle(moduleId: string): string {
  const indexed = indexCurriculumLessons(ACADEMY_CURRICULUM).get(moduleId);
  return indexed?.lesson.title || moduleId;
}

interface PgUserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  token_version: number;
  xp: number;
  streak: number;
  level: number;
  rank: string;
  completion: number;
  verified_topics: string[];
  last_active_date: string | null;
  last_streak_update: string | null;
  last_active_timestamp: string | null;
  learning_profile: LearningProfile | null;
}

interface PgProgressRow {
  user_id: string;
  schema_version: number;
  completed_lesson_ids: string[];
  completed_exercise_ids: string[];
  completed_quiz_lesson_ids: string[];
  completed_homework_lesson_ids: string[];
  legacy_completed_lesson_ids: string[];
  xp: number;
  streak: number;
  last_active_date: string | null;
  last_streak_update: string | null;
  last_active_timestamp: string | null;
  last_synced_at: string | null;
  updated_at: string | null;
}

interface PgGroupRow {
  id: string;
  name: string;
  description: string;
  avatar: string;
  visibility: string;
  owner_id: string | null;
  owner_handle: string;
  created_at: string;
}

interface PgPostRow {
  id: string;
  title: string;
  author: string;
  author_role: string;
  content: string;
  category: string;
  upvotes: number;
  user_vote: string | null;
  created_at: string;
  comments_count: number;
}

function mapUserRowToUser(
  u: PgUserRow,
  following: string[],
  followers: string[]
): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    streak: u.streak,
    lastActiveDate: u.last_active_date ?? null,
    xp: u.xp,
    rank: u.rank,
    level: u.level,
    completion: u.completion,
    verifiedTopics: Array.isArray(u.verified_topics) ? [...u.verified_topics] : [],
    following,
    followers,
    lastStreakUpdate: u.last_streak_update ?? null,
    lastActiveTimestamp: u.last_active_timestamp ?? null,
    learningProfile: normalizeLearningProfile(u.learning_profile),
  };
}

function mapProgressRow(
  u: PgUserRow,
  p: PgProgressRow | undefined,
  awardedXpEventIds: string[],
  postXpDailyLog: Record<string, number>
): UserProgress {
  return {
    schemaVersion: p?.schema_version ?? CURRENT_PROGRESS_SCHEMA_VERSION,
    completedLessonIds: Array.isArray(p?.completed_lesson_ids) ? [...p.completed_lesson_ids] : [],
    completedExerciseIds: Array.isArray(p?.completed_exercise_ids) ? [...p.completed_exercise_ids] : [],
    completedQuizLessonIds: Array.isArray(p?.completed_quiz_lesson_ids) ? [...p.completed_quiz_lesson_ids] : [],
    completedHomeworkLessonIds: Array.isArray(p?.completed_homework_lesson_ids) ? [...p.completed_homework_lesson_ids] : [],
    legacyCompletedLessonIds: Array.isArray(p?.legacy_completed_lesson_ids) ? [...p.legacy_completed_lesson_ids] : [],
    awardedXpEventIds,
    ...(Object.keys(postXpDailyLog).length > 0 ? { postXpDailyLog } : {}),
    xp: p?.xp ?? u.xp,
    streak: p?.streak ?? u.streak,
    lastActiveDate: p?.last_active_date ?? u.last_active_date ?? null,
    lastStreakUpdate: p?.last_streak_update ?? u.last_streak_update ?? null,
    lastActiveTimestamp: p?.last_active_timestamp ?? u.last_active_timestamp ?? null,
    ...(p?.last_synced_at ? { lastSyncedAt: p.last_synced_at } : {}),
    ...(p?.updated_at ? { updatedAt: p.updated_at } : {}),
  };
}

export class PostgresStore {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly databaseUrl?: string;
  private readonly skipBranchCheck: boolean;

  constructor(options?: {
    pool?: Pool;
    databaseUrl?: string;
    skipBranchCheck?: boolean;
  }) {
    if (options?.pool) {
      this.pool = options.pool;
      this.ownsPool = false;
    } else {
      const rawUrl = (options?.databaseUrl ?? process.env.DATABASE_URL ?? '').trim();
      if (!rawUrl) {
        throw new PgStorageUnavailableError(
          'Fail-closed: DATABASE_URL is not configured for STORAGE_BACKEND=postgres; refusing silent JSON fallback.'
        );
      }
      this.databaseUrl = rawUrl;
      this.pool = createNeonPool(rawUrl);
      this.ownsPool = true;
    }
    this.skipBranchCheck = Boolean(options?.skipBranchCheck);

    // Prevent unhandled 'error' events on idle pool clients when Neon closes idle TLS sockets
    this.pool.on('error', (err) => {
      console.error('[postgres-store] Idle pool client error:', redactPgSecrets(String(err?.message || err)));
    });
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  private async assertProductionNotConnectedToDevBranch(client: PoolClient): Promise<void> {
    if (process.env.NODE_ENV !== 'production' || this.skipBranchCheck) {
      return;
    }
    if (this.databaseUrl) {
      const parsed = new URL(this.databaseUrl);
      const endpointId = parsed.hostname.split('.')[0] || '';
      if (endpointId.startsWith(CONFIRMED_DEV_NEON_ENDPOINT_PREFIX)) {
        throw new Error(
          'Fail-closed: Refusing to connect production runtime to the Neon development endpoint.'
        );
      }
    }
    const res = await client.query<{ branch_id: string | null }>(
      `SELECT current_setting('neon.branch_id', true) AS branch_id`
    );
    if (res.rows[0]?.branch_id === CONFIRMED_DEV_NEON_BRANCH_ID) {
      throw new Error(
        'Fail-closed: Refusing to connect production runtime to the Neon development branch.'
      );
    }
  }

  async initAndVerifyReady(): Promise<{
    ready: true;
    projectId: string | null;
    branchId: string | null;
    tableCount: number;
  }> {
    const client = await this.pool.connect();
    try {
      await this.assertProductionNotConnectedToDevBranch(client);
    } finally {
      client.release();
    }

    return assertPostgresStorageReadyOrFailClosed({
      pool: this.pool,
      databaseUrl: this.databaseUrl,
      skipBranchCheck: this.skipBranchCheck || process.env.NODE_ENV === 'production',
    });
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } catch (err) {
      throw new PgStorageUnavailableError(redactPgSecrets(String((err as any)?.message || err)));
    }
    try {
      return await fn(client);
    } catch (err) {
      if (isPgConnectionOrInfraError(err)) {
        throw new PgStorageUnavailableError(redactPgSecrets(String((err as any)?.message || err)));
      }
      throw err;
    } finally {
      client.release();
    }
  }

  private async withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      await client.query('BEGIN');
      try {
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      }
    });
  }

  private async loadFollowListsForUser(
    client: PoolClient,
    userId: string,
    username: string
  ): Promise<{ following: string[]; followers: string[] }> {
    const followingRes = await client.query<{ followed_handle: string }>(
      `
      SELECT followed_handle
      FROM user_follows
      WHERE follower_user_id = $1 AND recorded_in_following = true
      ORDER BY created_at ASC, followed_handle ASC
      `,
      [userId]
    );
    const normHandle = normalizeHandle(username);
    const followersRes = await client.query<{ username: string }>(
      `
      SELECT u.username
      FROM user_follows f
      INNER JOIN users u ON u.id = f.follower_user_id
      WHERE f.recorded_in_target_followers = true
        AND (f.followed_user_id = $1 OR LOWER(f.followed_handle) = $2)
      ORDER BY f.created_at ASC, u.username ASC
      `,
      [userId, normHandle]
    );

    return {
      following: followingRes.rows.map((r) => r.followed_handle),
      followers: followersRes.rows.map((r) => r.username),
    };
  }

  private async loadAccountById(
    client: PoolClient,
    userId: string,
    lockForUpdate = false
  ): Promise<AccountRecord | null> {
    const lockClause = lockForUpdate ? ' FOR UPDATE' : '';
    const userRes = await client.query<PgUserRow>(
      `SELECT * FROM users WHERE id = $1${lockClause}`,
      [userId]
    );
    const u = userRes.rows[0];
    if (!u) return null;

    const progRes = await client.query<PgProgressRow>(
      `SELECT * FROM user_progress WHERE user_id = $1${lockClause}`,
      [userId]
    );
    const xpRes = await client.query<{ event_id: string }>(
      `SELECT event_id FROM xp_events WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    const dailyRes = await client.query<{ date_key: string; xp_awarded: number }>(
      `SELECT date_key, xp_awarded FROM post_xp_daily_totals WHERE user_id = $1`,
      [userId]
    );
    const notesRes = await client.query<{
      id: string;
      module_id: string;
      module_title: string;
      title: string;
      content: string;
      last_saved: string;
    }>(
      `SELECT id, module_id, module_title, title, content, last_saved FROM lab_notes WHERE user_id = $1 ORDER BY last_saved DESC`,
      [userId]
    );
    const labExpRes = await client.query<{
      lab_id: string;
      explored_diagram_ids: string[];
      executed_terminal_commands: string[];
      log_target_verified: boolean;
      verified_log_entry_id: string | null;
      scenario_verified: boolean;
      verified_highlight_lines: number[];
    }>(`SELECT * FROM lab_exploration WHERE user_id = $1`, [userId]);
    const capRes = await client.query<{
      capstone_id: string;
      current_stage_id: string;
      stages: CapstoneAccountProgress['stages'];
      report_submitted: boolean;
      report_score: number | null;
      max_report_score: number | null;
      rubric_breakdown: CapstoneAccountProgress['rubricBreakdown'] | null;
      last_submission_sections: Record<string, string> | null;
      detailed_solution_explanation: string | null;
      completed_at: string | null;
    }>(`SELECT * FROM capstone_progress WHERE user_id = $1`, [userId]);

    const { following, followers } = await this.loadFollowListsForUser(client, u.id, u.username);

    const postXpDailyLog: Record<string, number> = {};
    for (const row of dailyRes.rows) {
      postXpDailyLog[row.date_key] = row.xp_awarded;
    }

    const labExploration: LabExplorationMap = {};
    for (const row of labExpRes.rows) {
      const entry: LabExplorationProgress = {};
      if (row.explored_diagram_ids?.length) entry.exploredDiagramIds = [...row.explored_diagram_ids];
      if (row.executed_terminal_commands?.length) {
        entry.executedTerminalCommands = [...row.executed_terminal_commands];
      }
      if (row.log_target_verified) entry.logTargetVerified = true;
      if (row.verified_log_entry_id) entry.verifiedLogEntryId = row.verified_log_entry_id;
      if (row.scenario_verified) entry.scenarioVerified = true;
      if (row.verified_highlight_lines?.length) {
        entry.verifiedHighlightLines = [...row.verified_highlight_lines];
      }
      labExploration[row.lab_id] = entry;
    }

    const capstoneProgress: CapstoneProgressMap = {};
    for (const row of capRes.rows) {
      capstoneProgress[row.capstone_id] = {
        capstoneId: row.capstone_id,
        currentStageId: row.current_stage_id,
        stages: row.stages || {},
        reportSubmitted: row.report_submitted,
        ...(row.report_score !== null ? { reportScore: row.report_score } : {}),
        ...(row.max_report_score !== null ? { maxReportScore: row.max_report_score } : {}),
        ...(row.rubric_breakdown ? { rubricBreakdown: row.rubric_breakdown } : {}),
        ...(row.last_submission_sections
          ? { lastSubmissionSections: row.last_submission_sections }
          : {}),
        ...(row.detailed_solution_explanation
          ? { detailedSolutionExplanation: row.detailed_solution_explanation }
          : {}),
        ...(row.completed_at ? { completedAt: row.completed_at } : {}),
      };
    }

    const labNotes: LabNote[] = notesRes.rows.map((n) => ({
      id: n.id,
      moduleId: n.module_id,
      moduleTitle: n.module_title,
      title: n.title,
      content: n.content,
      lastSaved: n.last_saved,
    }));

    return {
      email: u.email,
      passwordHash: u.password_hash,
      tokenVersion: u.token_version ?? 1,
      user: mapUserRowToUser(u, following, followers),
      progress: mapProgressRow(
        u,
        progRes.rows[0],
        xpRes.rows.map((r) => r.event_id),
        postXpDailyLog
      ),
      labNotes,
      ...(Object.keys(labExploration).length > 0 ? { labExploration } : {}),
      ...(Object.keys(capstoneProgress).length > 0 ? { capstoneProgress } : {}),
    };
  }

  private async findUserByHandle(client: PoolClient, rawHandle: string): Promise<PgUserRow | null> {
    const cleanNoAt = rawHandle.trim().replace(/^@+/, '').toLowerCase();
    if (!cleanNoAt) return null;
    const res = await client.query<PgUserRow>(
      `
      SELECT *
      FROM users
      WHERE LOWER(LTRIM(TRIM(username), '@')) = $1
      LIMIT 1
      `,
      [cleanNoAt]
    );
    return res.rows[0] || null;
  }

  private async syncNewXpEventsAndTotalsTx(
    client: PoolClient,
    userId: string,
    previousEventIds: Set<string>,
    account: AccountRecord,
    timelineAction?: string,
    reportedXpAwarded = 0
  ): Promise<number> {
    let newlyInsertedCount = 0;
    for (const evId of account.progress.awardedXpEventIds || []) {
      if (previousEventIds.has(evId)) continue;
      const ins = await client.query<{ event_id: string }>(
        `
        INSERT INTO xp_events (user_id, event_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, event_id) DO NOTHING
        RETURNING event_id
        `,
        [userId, evId]
      );
      if ((ins.rowCount ?? 0) > 0) {
        newlyInsertedCount++;
      }
    }

    const xpToPersist = reportedXpAwarded > 0 && newlyInsertedCount === 0
      ? undefined
      : account.user.xp;

    if (xpToPersist !== undefined) {
      await client.query(
        `
        UPDATE users
        SET xp = $2,
            streak = $3,
            level = $4,
            rank = $5,
            completion = $6,
            verified_topics = $7::jsonb,
            last_active_date = $8,
            last_streak_update = $9,
            last_active_timestamp = $10,
            updated_at = NOW()
        WHERE id = $1
        `,
        [
          userId,
          account.user.xp,
          account.user.streak,
          account.user.level,
          account.user.rank,
          account.user.completion,
          JSON.stringify(account.user.verifiedTopics || []),
          account.user.lastActiveDate ?? null,
          account.user.lastStreakUpdate ?? null,
          account.user.lastActiveTimestamp ?? null,
        ]
      );

      await client.query(
        `
        UPDATE user_progress
        SET schema_version = $2,
            completed_lesson_ids = $3::jsonb,
            completed_exercise_ids = $4::jsonb,
            completed_quiz_lesson_ids = $5::jsonb,
            completed_homework_lesson_ids = $6::jsonb,
            legacy_completed_lesson_ids = $7::jsonb,
            xp = $8,
            streak = $9,
            last_active_date = $10,
            last_streak_update = $11,
            last_active_timestamp = $12,
            last_synced_at = $13,
            updated_at = $14
        WHERE user_id = $1
        `,
        [
          userId,
          account.progress.schemaVersion ?? CURRENT_PROGRESS_SCHEMA_VERSION,
          JSON.stringify(account.progress.completedLessonIds || []),
          JSON.stringify(account.progress.completedExerciseIds || []),
          JSON.stringify(account.progress.completedQuizLessonIds || []),
          JSON.stringify(account.progress.completedHomeworkLessonIds || []),
          JSON.stringify(account.progress.legacyCompletedLessonIds || []),
          account.progress.xp,
          account.progress.streak,
          account.progress.lastActiveDate ?? null,
          account.progress.lastStreakUpdate ?? null,
          account.progress.lastActiveTimestamp ?? null,
          account.progress.lastSyncedAt ?? null,
          account.progress.updatedAt ?? new Date().toISOString(),
        ]
      );
    }

    const effectiveXpAwarded = newlyInsertedCount > 0 ? reportedXpAwarded : 0;
    if (effectiveXpAwarded > 0 && timelineAction) {
      await client.query(
        `
        INSERT INTO timeline_events (id, username, action, xp_reward, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          `ev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          account.user.username,
          timelineAction,
          effectiveXpAwarded,
          new Date().toISOString(),
        ]
      );
    }

    return effectiveXpAwarded;
  }

  async authenticateSession(
    sid: string,
    userId: string,
    tokenVersion: number
  ): Promise<
    | { ok: true; account: AccountRecord }
    | { ok: false; status: number; error: string }
  > {
    return this.withClient(async (client) => {
      const nowSec = Math.floor(Date.now() / 1000);
      const revRes = await client.query<{ sid: string }>(
        `SELECT sid FROM revoked_sessions WHERE sid = $1 AND exp > $2 LIMIT 1`,
        [sid, nowSec]
      );
      if ((revRes.rowCount ?? 0) > 0) {
        return {
          ok: false,
          status: 401,
          error: 'Session has been invalidated. Please sign in again.',
        };
      }

      const account = await this.loadAccountById(client, userId, false);
      if (!account) {
        return { ok: false, status: 401, error: 'Account associated with session not found.' };
      }

      if ((account.tokenVersion ?? 1) !== tokenVersion) {
        return { ok: false, status: 401, error: 'Session token version is no longer active.' };
      }

      return { ok: true, account };
    });
  }

  async getAccountById(userId: string): Promise<AccountRecord | null> {
    return this.withClient((client) => this.loadAccountById(client, userId, false));
  }

  async registerAccount(input: {
    trimmedEmail: string;
    formattedUsername: string;
    passwordHash: string;
    learningProfile: LearningProfile;
  }): Promise<
    | { ok: true; user: User; progress: UserProgress }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const dupCheck = await client.query<{ id: string }>(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
           OR LOWER(LTRIM(username, '@')) = LOWER(LTRIM($2, '@'))
        LIMIT 1
        `,
        [input.trimmedEmail, input.formattedUsername]
      );
      if ((dupCheck.rowCount ?? 0) > 0) {
        return {
          ok: false,
          status: 409,
          error:
            'Registration could not be completed with the provided details. Please verify your inputs or sign in.',
        };
      }

      const userId = `usr-${crypto.randomBytes(5).toString('hex')}`;
      const nowIso = new Date().toISOString();

      try {
        await client.query(
          `
          INSERT INTO users (
            id, email, username, password_hash, token_version,
            xp, streak, level, rank, completion, verified_topics,
            last_active_date, last_streak_update, last_active_timestamp, learning_profile
          )
          VALUES ($1, $2, $3, $4, 1, 0, 0, 1, 'Cadet', 0, '[]'::jsonb, NULL, NULL, NULL, $5::jsonb)
          `,
          [
            userId,
            input.trimmedEmail,
            input.formattedUsername,
            input.passwordHash,
            JSON.stringify(input.learningProfile),
          ]
        );

        await client.query(
          `
          INSERT INTO user_progress (
            user_id, schema_version,
            completed_lesson_ids, completed_exercise_ids,
            completed_quiz_lesson_ids, completed_homework_lesson_ids,
            legacy_completed_lesson_ids,
            xp, streak, last_active_date, last_streak_update, last_active_timestamp,
            last_synced_at, updated_at
          )
          VALUES ($1, $2, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0, NULL, NULL, NULL, NULL, $3)
          `,
          [userId, CURRENT_PROGRESS_SCHEMA_VERSION, nowIso]
        );
      } catch (err: any) {
        if (err?.code === '23505') {
          return {
            ok: false,
            status: 409,
            error:
              'Registration could not be completed with the provided details. Please verify your inputs or sign in.',
          };
        }
        throw err;
      }

      const newUser: User = {
        id: userId,
        username: input.formattedUsername,
        email: input.trimmedEmail,
        streak: 0,
        lastActiveDate: null,
        xp: 0,
        rank: 'Cadet',
        level: 1,
        completion: 0,
        verifiedTopics: [],
        following: [],
        followers: [],
        lastStreakUpdate: null,
        lastActiveTimestamp: null,
        learningProfile: input.learningProfile,
      };

      const newProgress: UserProgress = {
        schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
        completedLessonIds: [],
        completedExerciseIds: [],
        completedQuizLessonIds: [],
        completedHomeworkLessonIds: [],
        legacyCompletedLessonIds: [],
        awardedXpEventIds: [],
        xp: 0,
        streak: 0,
        lastActiveDate: null,
        lastStreakUpdate: null,
        lastActiveTimestamp: null,
        updatedAt: nowIso,
      };

      return { ok: true, user: newUser, progress: newProgress };
    });
  }

  async loginAccount(
    normalizedInput: string,
    password: string,
    verifyPasswordFn: (
      password: string,
      storedHash: string
    ) => Promise<{ valid: boolean; needsUpgrade: boolean }>,
    hashPasswordFn: (password: string) => Promise<string>
  ): Promise<{ authenticated: false } | { authenticated: true; account: AccountRecord }> {
    const cleanNoAt = normalizedInput.replace(/^@+/, '');
    const withAt = `@${cleanNoAt}`;

    const matchedUserId = await this.withClient(async (client) => {
      const matchRes = await client.query<{ id: string; password_hash: string; token_version: number }>(
        `
        SELECT id, password_hash, token_version
        FROM users
        WHERE LOWER(TRIM(email)) = $1
           OR LOWER(TRIM(username)) = $1
           OR LOWER(TRIM(username)) = $2
           OR LOWER(LTRIM(TRIM(username), '@')) = $3
        LIMIT 1
        `,
        [normalizedInput, withAt, cleanNoAt]
      );
      const row = matchRes.rows[0];
      if (!row) {
        await verifyPasswordFn(password, DUMMY_SCRYPT_HASH);
        return null;
      }
      const { valid, needsUpgrade } = await verifyPasswordFn(password, row.password_hash);
      if (!valid) {
        return null;
      }
      if (needsUpgrade) {
        const upgraded = await hashPasswordFn(password);
        await client.query(
          `
          UPDATE users
          SET password_hash = $2,
              token_version = COALESCE(token_version, 1),
              updated_at = NOW()
          WHERE id = $1
          `,
          [row.id, upgraded]
        );
      }
      return row.id;
    });

    if (!matchedUserId) {
      return { authenticated: false };
    }

    const account = await this.withClient((client) => this.loadAccountById(client, matchedUserId, false));
    if (!account) {
      return { authenticated: false };
    }
    return { authenticated: true, account };
  }

  async revokeSession(sid: string, exp: number): Promise<void> {
    await this.withTx(async (client) => {
      const nowSec = Math.floor(Date.now() / 1000);
      await client.query(`DELETE FROM revoked_sessions WHERE exp <= $1`, [nowSec]);
      await client.query(
        `
        INSERT INTO revoked_sessions (sid, exp)
        VALUES ($1, $2)
        ON CONFLICT (sid) DO UPDATE SET exp = GREATEST(revoked_sessions.exp, EXCLUDED.exp)
        `,
        [sid, exp]
      );
    });
  }

  async getPublicDirectoryUsers() {
    return this.withClient(async (client) => {
      const usersRes = await client.query<PgUserRow>(
        `SELECT * FROM users ORDER BY created_at ASC, id ASC`
      );
      const followsRes = await client.query<{
        follower_user_id: string;
        followed_handle: string;
        followed_user_id: string | null;
        recorded_in_following: boolean;
        recorded_in_target_followers: boolean;
      }>(`SELECT * FROM user_follows ORDER BY created_at ASC`);

      const usernameById = new Map(usersRes.rows.map((u) => [u.id, u.username]));

      return usersRes.rows.map((u) => {
        const following = followsRes.rows
          .filter((f) => f.follower_user_id === u.id && f.recorded_in_following)
          .map((f) => f.followed_handle);
        const normU = normalizeHandle(u.username);
        const followers = followsRes.rows
          .filter(
            (f) =>
              f.recorded_in_target_followers &&
              (f.followed_user_id === u.id || normalizeHandle(f.followed_handle) === normU)
          )
          .map((f) => usernameById.get(f.follower_user_id))
          .filter((name): name is string => Boolean(name));

        return toPublicDirectoryUser(mapUserRowToUser(u, following, followers));
      });
    });
  }

  async toggleFollowUser(
    userId: string,
    targetUsername: string
  ): Promise<{ ok: true; following: string[] } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const selfRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const selfRow = selfRes.rows[0];
      if (!selfRow) {
        return { ok: false, status: 404, error: 'Account not found' };
      }

      const targetRow = await this.findUserByHandle(client, targetUsername);
      if (!targetRow) {
        return { ok: false, status: 404, error: 'Target user not found.' };
      }
      if (targetRow.id === selfRow.id) {
        return { ok: false, status: 400, error: 'Cannot follow your own account.' };
      }

      // Deterministic row lock ordering prevents deadlocks across mutual concurrent follows
      const lockOrder = [selfRow.id, targetRow.id].sort();
      await client.query(`SELECT id FROM users WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, [
        lockOrder,
      ]);

      const canonicalTarget = targetRow.username;
      const existingFollow = await client.query<{ followed_handle: string }>(
        `
        SELECT followed_handle
        FROM user_follows
        WHERE follower_user_id = $1
          AND (followed_user_id = $2 OR LOWER(followed_handle) = LOWER($3))
        `,
        [selfRow.id, targetRow.id, canonicalTarget]
      );

      if ((existingFollow.rowCount ?? 0) > 0) {
        await client.query(
          `
          DELETE FROM user_follows
          WHERE follower_user_id = $1
            AND (followed_user_id = $2 OR LOWER(followed_handle) = LOWER($3))
          `,
          [selfRow.id, targetRow.id, canonicalTarget]
        );
      } else {
        await client.query(
          `
          INSERT INTO user_follows (
            follower_user_id, followed_handle, followed_user_id,
            recorded_in_following, recorded_in_target_followers
          )
          VALUES ($1, $2, $3, true, true)
          ON CONFLICT (follower_user_id, followed_handle)
          DO UPDATE SET
            followed_user_id = EXCLUDED.followed_user_id,
            recorded_in_following = true,
            recorded_in_target_followers = true
          `,
          [selfRow.id, canonicalTarget, targetRow.id]
        );
      }

      const { following } = await this.loadFollowListsForUser(client, selfRow.id, selfRow.username);
      return { ok: true, following };
    });
  }

  async syncUserProgress(
    userId: string,
    payload: any
  ): Promise<
    | { ok: true; user: User; progress: UserProgress; staleOverwritePrevented: boolean }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { ok: false, status: 404, error: 'Account not found' };
      }

      const syncResult = applySafeProgressSync(account, payload || {}, ACADEMY_CURRICULUM);
      if (syncResult.ok === false) {
        return { ok: false, status: syncResult.status, error: syncResult.error };
      }

      await client.query(
        `
        UPDATE users
        SET level = $2, rank = $3, completion = $4, updated_at = NOW()
        WHERE id = $1
        `,
        [userId, account.user.level, account.user.rank, account.user.completion]
      );
      await client.query(
        `
        UPDATE user_progress
        SET last_synced_at = $2, updated_at = $3
        WHERE user_id = $1
        `,
        [
          userId,
          account.progress.lastSyncedAt ?? new Date().toISOString(),
          account.progress.updatedAt ?? new Date().toISOString(),
        ]
      );

      return {
        ok: true,
        user: sanitizeSelfUser(account.user),
        progress: account.progress,
        staleOverwritePrevented: syncResult.staleOverwritePrevented,
      };
    });
  }

  async getLearningProfile(
    userId: string
  ): Promise<
    | { ok: true; learningProfile: LearningProfile }
    | { ok: false; status: number; error: string }
  > {
    return this.withClient(async (client) => {
      const res = await client.query<{ learning_profile: LearningProfile | null }>(
        `SELECT learning_profile FROM users WHERE id = $1`,
        [userId]
      );
      if ((res.rowCount ?? 0) === 0) {
        return { ok: false, status: 404, error: 'Account not found.' };
      }
      return {
        ok: true,
        learningProfile: normalizeLearningProfile(res.rows[0].learning_profile),
      };
    });
  }

  async updateLearningProfile(
    userId: string,
    body: unknown
  ): Promise<
    | { ok: true; learningProfile: LearningProfile; user: User }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { ok: false, status: 404, error: 'Account not found.' };
      }

      const validated = validateLearningProfileUpdate(body, account.user.learningProfile);
      if (validated.ok === false) {
        return { ok: false, status: validated.status, error: validated.error };
      }

      account.user.learningProfile = validated.profile;
      await client.query(
        `
        UPDATE users
        SET learning_profile = $2::jsonb, updated_at = NOW()
        WHERE id = $1
        `,
        [userId, JSON.stringify(validated.profile)]
      );

      return {
        ok: true,
        learningProfile: validated.profile,
        user: sanitizeSelfUser(account.user),
      };
    });
  }

  private async upsertCapstoneTx(
    client: PoolClient,
    userId: string,
    capstoneId: string,
    rec: CapstoneAccountProgress
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO capstone_progress (
        user_id, capstone_id, current_stage_id, stages,
        report_submitted, report_score, max_report_score,
        rubric_breakdown, last_submission_sections,
        detailed_solution_explanation, completed_at, updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, NOW())
      ON CONFLICT (user_id, capstone_id) DO UPDATE SET
        current_stage_id = EXCLUDED.current_stage_id,
        stages = EXCLUDED.stages,
        report_submitted = EXCLUDED.report_submitted,
        report_score = EXCLUDED.report_score,
        max_report_score = EXCLUDED.max_report_score,
        rubric_breakdown = EXCLUDED.rubric_breakdown,
        last_submission_sections = EXCLUDED.last_submission_sections,
        detailed_solution_explanation = EXCLUDED.detailed_solution_explanation,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
      `,
      [
        userId,
        capstoneId,
        rec.currentStageId,
        JSON.stringify(rec.stages || {}),
        Boolean(rec.reportSubmitted),
        rec.reportScore ?? null,
        rec.maxReportScore ?? null,
        rec.rubricBreakdown ? JSON.stringify(rec.rubricBreakdown) : null,
        rec.lastSubmissionSections ? JSON.stringify(rec.lastSubmissionSections) : null,
        rec.detailedSolutionExplanation ?? null,
        rec.completedAt ?? null,
      ]
    );
  }

  async verifyCapstoneEvidence(
    userId: string,
    capstoneId: string,
    stageId: unknown,
    artifactId: unknown,
    selectedLines: unknown
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found.' } };
      }

      const prevEvents = new Set(account.progress.awardedXpEventIds || []);
      const result = processCapstoneEvidenceVerification(
        account,
        capstoneId,
        stageId,
        artifactId,
        selectedLines
      );
      if (result.ok === false) {
        return {
          status: result.status,
          body: {
            error: result.error,
            ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
          },
        };
      }

      let effectiveXpAwarded = result.data.xpAwarded;
      if (result.dbChanged) {
        const capRecord = account.capstoneProgress?.[result.data.capstoneId];
        if (capRecord) {
          await this.upsertCapstoneTx(client, userId, result.data.capstoneId, capRecord);
        }
        effectiveXpAwarded = await this.syncNewXpEventsAndTotalsTx(
          client,
          userId,
          prevEvents,
          account,
          result.timelineAction,
          result.data.xpAwarded
        );
      }

      return {
        status: 200,
        body: {
          ...result.data,
          xpAwarded: effectiveXpAwarded,
          ...(result.data.user ? { user: sanitizeSelfUser(result.data.user) } : {}),
        },
      };
    });
  }

  async submitCapstoneStageCheck(
    userId: string,
    capstoneId: string,
    stageId: unknown,
    selectedOption: unknown
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found.' } };
      }

      const prevEvents = new Set(account.progress.awardedXpEventIds || []);
      const result = processCapstoneStageCheck(account, capstoneId, stageId, selectedOption);
      if (result.ok === false) {
        return {
          status: result.status,
          body: {
            error: result.error,
            ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
          },
        };
      }

      let effectiveXpAwarded = result.data.xpAwarded;
      if (result.dbChanged) {
        const capRecord = account.capstoneProgress?.[result.data.capstoneId];
        if (capRecord) {
          await this.upsertCapstoneTx(client, userId, result.data.capstoneId, capRecord);
        }
        effectiveXpAwarded = await this.syncNewXpEventsAndTotalsTx(
          client,
          userId,
          prevEvents,
          account,
          result.timelineAction,
          result.data.xpAwarded
        );
      }

      return {
        status: 200,
        body: {
          ...result.data,
          xpAwarded: effectiveXpAwarded,
          ...(result.data.user ? { user: sanitizeSelfUser(result.data.user) } : {}),
        },
      };
    });
  }

  async submitCapstoneReport(
    userId: string,
    capstoneId: string,
    sections: unknown
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found.' } };
      }

      const prevEvents = new Set(account.progress.awardedXpEventIds || []);
      const result = processCapstoneReportSubmission(account, capstoneId, sections);
      if (result.ok === false) {
        return {
          status: result.status,
          body: {
            error: result.error,
            ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
          },
        };
      }

      let effectiveXpAwarded = result.data.xpAwarded;
      if (result.dbChanged) {
        const capRecord = account.capstoneProgress?.[result.data.capstoneId];
        if (capRecord) {
          await this.upsertCapstoneTx(client, userId, result.data.capstoneId, capRecord);
        }
        effectiveXpAwarded = await this.syncNewXpEventsAndTotalsTx(
          client,
          userId,
          prevEvents,
          account,
          result.timelineAction,
          result.data.xpAwarded
        );
      }

      return {
        status: 200,
        body: {
          ...result.data,
          xpAwarded: effectiveXpAwarded,
          ...(result.data.user ? { user: sanitizeSelfUser(result.data.user) } : {}),
        },
      };
    });
  }

  private async upsertLabExplorationTx(
    client: PoolClient,
    userId: string,
    labId: string,
    exp: LabExplorationProgress,
    complete: boolean
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO lab_exploration (
        user_id, lab_id, explored_diagram_ids, executed_terminal_commands,
        log_target_verified, verified_log_entry_id,
        scenario_verified, verified_highlight_lines, exploration_complete, updated_at
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb, $9, NOW())
      ON CONFLICT (user_id, lab_id) DO UPDATE SET
        explored_diagram_ids = EXCLUDED.explored_diagram_ids,
        executed_terminal_commands = EXCLUDED.executed_terminal_commands,
        log_target_verified = EXCLUDED.log_target_verified,
        verified_log_entry_id = EXCLUDED.verified_log_entry_id,
        scenario_verified = EXCLUDED.scenario_verified,
        verified_highlight_lines = EXCLUDED.verified_highlight_lines,
        exploration_complete = EXCLUDED.exploration_complete,
        updated_at = NOW()
      `,
      [
        userId,
        labId,
        JSON.stringify(exp.exploredDiagramIds || []),
        JSON.stringify(exp.executedTerminalCommands || []),
        Boolean(exp.logTargetVerified),
        exp.verifiedLogEntryId ?? null,
        Boolean(exp.scenarioVerified),
        JSON.stringify(exp.verifiedHighlightLines || []),
        complete,
      ]
    );
  }

  async verifyLogInvestigation(
    userId: string,
    lessonId: string,
    labId: string,
    entryId: string
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found.' } };
      }

      const result = verifyLogInvestigationTarget(
        lessonId,
        labId,
        entryId,
        account.progress,
        ACADEMY_CURRICULUM
      );
      if (result.ok === false) {
        return {
          status: result.status,
          body: {
            error: result.error,
            ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
          },
        };
      }

      let explorationMeta: { explorationComplete: boolean } | null = null;
      if (result.isTarget) {
        const recorded = recordVerifiedLogInvestigation(account, result.lab, result.entryId);
        explorationMeta = { explorationComplete: recorded.explorationComplete };
        const rawExp = account.labExploration?.[result.lab.id] || {};
        await this.upsertLabExplorationTx(
          client,
          userId,
          result.lab.id,
          rawExp,
          recorded.explorationComplete
        );
      }

      return {
        status: 200,
        body: {
          isTarget: result.isTarget,
          message: result.message,
          analysisNote: result.analysisNote,
          ...(result.correlationSummary ? { correlationSummary: result.correlationSummary } : {}),
          ...(explorationMeta
            ? {
                explorationComplete: explorationMeta.explorationComplete,
                verifiedLogEntryId: result.entryId,
              }
            : {}),
        },
      };
    });
  }

  async exploreLabStep(
    userId: string,
    body: any
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found.' } };
      }

      const result = processLabExplorationStep(account, body || {}, ACADEMY_CURRICULUM);
      if (result.ok === false) {
        return {
          status: result.status,
          body: {
            error: result.error,
            ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
          },
        };
      }

      if (result.dbChanged) {
        const rawExp = account.labExploration?.[result.data.labId] || {};
        await this.upsertLabExplorationTx(
          client,
          userId,
          result.data.labId,
          rawExp,
          result.data.explorationComplete
        );
      }

      return { status: 200, body: result.data };
    });
  }

  async engageUser(
    userId: string,
    input: EngagementInput
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { status: 404, body: { error: 'Account not found' } };
      }

      const prevEvents = new Set(account.progress.awardedXpEventIds || []);
      const outcome = applyEngagementMutation(account, input, ACADEMY_CURRICULUM);

      if (outcome.ok === false) {
        return {
          status: outcome.status,
          body: {
            error: outcome.error,
            ...(outcome.missingPrerequisites
              ? { missingPrerequisites: outcome.missingPrerequisites }
              : {}),
            ...(outcome.scorePercent !== undefined ? { scorePercent: outcome.scorePercent } : {}),
            ...(outcome.requiredPercent !== undefined
              ? { requiredPercent: outcome.requiredPercent }
              : {}),
            ...(outcome.correctCount !== undefined ? { correctCount: outcome.correctCount } : {}),
            ...(outcome.totalQuestions !== undefined
              ? { totalQuestions: outcome.totalQuestions }
              : {}),
            ...(outcome.passed !== undefined ? { passed: outcome.passed } : {}),
            ...(outcome.questionFeedback ? { questionFeedback: outcome.questionFeedback } : {}),
            ...(outcome.misconceptionHints ? { misconceptionHints: outcome.misconceptionHints } : {}),
            ...(outcome.recommendedSections ? { recommendedSections: outcome.recommendedSections } : {}),
            ...(outcome.misconceptionFeedback
              ? { misconceptionFeedback: outcome.misconceptionFeedback }
              : {}),
            ...(outcome.selectedReasoningStatus
              ? { selectedReasoningStatus: outcome.selectedReasoningStatus }
              : {}),
            ...(outcome.hint ? { hint: outcome.hint } : {}),
            ...(outcome.reviewSection ? { reviewSection: outcome.reviewSection } : {}),
          },
        };
      }

      const effectiveXpAwarded = await this.syncNewXpEventsAndTotalsTx(
        client,
        userId,
        prevEvents,
        account,
        outcome.timelineAction,
        outcome.xpAwarded
      );

      // Keep progress JSON synchronized with actual PG state
      account.progress.xp = account.user.xp;

      return {
        status: 200,
        body: {
          user: sanitizeSelfUser(account.user),
          progress: account.progress,
          xpAwarded: effectiveXpAwarded,
          newlyCompletedLesson: outcome.newlyCompletedLesson,
          scorePercent: outcome.scorePercent,
          requiredPercent: outcome.requiredPercent,
          correctCount: outcome.correctCount,
          totalQuestions: outcome.totalQuestions,
          passed: outcome.passed,
          ...(outcome.questionFeedback ? { questionFeedback: outcome.questionFeedback } : {}),
          ...(outcome.explanation ? { explanation: outcome.explanation } : {}),
        },
      };
    });
  }

  async getPosts(viewerUserId?: string): Promise<CommunityPost[]> {
    return this.withClient(async (client) => {
      const postsRes = await client.query<PgPostRow>(
        `SELECT * FROM posts ORDER BY created_at DESC, id DESC`
      );
      let viewerVotes = new Map<string, 'up' | 'down'>();
      if (viewerUserId) {
        const voteRes = await client.query<{ post_id: string; vote: string }>(
          `SELECT post_id, vote FROM post_votes WHERE user_id = $1`,
          [viewerUserId]
        );
        for (const v of voteRes.rows) {
          if (v.vote === 'up' || v.vote === 'down') {
            viewerVotes.set(v.post_id, v.vote);
          }
        }
      }

      return postsRes.rows.map((p) => {
        const votesByUserId: Record<string, 'up' | 'down'> = {};
        if (viewerUserId && viewerVotes.has(p.id)) {
          votesByUserId[viewerUserId] = viewerVotes.get(p.id)!;
        }
        const persisted: PersistedCommunityPost = {
          id: p.id,
          title: p.title,
          author: p.author,
          authorRole: sanitizeAuthorRole(p.author_role),
          content: p.content,
          category: sanitizePostCategory(p.category),
          upvotes: p.upvotes,
          userVote: p.user_vote === 'up' || p.user_vote === 'down' ? p.user_vote : null,
          ...(Object.keys(votesByUserId).length > 0 ? { votesByUserId } : {}),
          createdAt: p.created_at,
          commentsCount: p.comments_count,
        };
        return sanitizePostForClient(persisted, viewerUserId);
      });
    });
  }

  async createPost(
    userId: string,
    input: { title: string; content: string; category: PersistedCommunityPost['category'] }
  ): Promise<
    | { ok: true; body: Record<string, any> }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const account = await this.loadAccountById(client, userId, true);
      if (!account) {
        return { ok: false, status: 404, error: 'User not found.' };
      }

      const prevEvents = new Set(account.progress.awardedXpEventIds || []);
      const derivedRole = deriveForumRoleFromRank(account.user.rank);
      const createdAt = new Date().toISOString();
      const postId = `post-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

      const newPost: PersistedCommunityPost = {
        id: postId,
        title: input.title,
        author: account.user.username.replace('@', ''),
        authorRole: derivedRole,
        content: input.content,
        category: input.category,
        upvotes: 1,
        userVote: 'up',
        votesByUserId: { [account.user.id]: 'up' },
        createdAt,
        commentsCount: 0,
      };

      await client.query(
        `
        INSERT INTO posts (
          id, title, author, author_role, content, category,
          upvotes, user_vote, created_at, comments_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, 1, 'up', $7, 0)
        `,
        [
          newPost.id,
          newPost.title,
          newPost.author,
          newPost.authorRole,
          newPost.content,
          newPost.category,
          newPost.createdAt,
        ]
      );

      await client.query(
        `
        INSERT INTO post_votes (post_id, user_id, vote)
        VALUES ($1, $2, 'up')
        `,
        [newPost.id, account.user.id]
      );

      const xpOutcome = applyPostCreationXp(account, newPost.id, newPost.title);

      // Sync daily post XP log rows (including 30-day pruning performed by applyPostCreationXp)
      const dailyLog = account.progress.postXpDailyLog || {};
      const retainedKeys = Object.keys(dailyLog);
      if (retainedKeys.length === 0) {
        await client.query(`DELETE FROM post_xp_daily_totals WHERE user_id = $1`, [userId]);
      } else {
        await client.query(
          `DELETE FROM post_xp_daily_totals WHERE user_id = $1 AND NOT (date_key = ANY($2::text[]))`,
          [userId, retainedKeys]
        );
        for (const [dateKey, xpAwarded] of Object.entries(dailyLog)) {
          await client.query(
            `
            INSERT INTO post_xp_daily_totals (user_id, date_key, xp_awarded)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, date_key) DO UPDATE SET xp_awarded = EXCLUDED.xp_awarded
            `,
            [userId, dateKey, xpAwarded]
          );
        }
      }

      const effectiveXpAwarded = await this.syncNewXpEventsAndTotalsTx(
        client,
        userId,
        prevEvents,
        account,
        xpOutcome.timelineEvent?.action,
        xpOutcome.xpAwarded
      );

      return {
        ok: true,
        body: {
          ...sanitizePostForClient(newPost, account.user.id),
          xpAwarded: effectiveXpAwarded,
          dailyPostXpCapReached: xpOutcome.dailyCapReached,
          user: sanitizeSelfUser(account.user),
          progress: account.progress,
        },
      };
    });
  }

  async votePost(
    userId: string,
    postId: string,
    voteType: 'up' | 'down' | null
  ): Promise<
    | { ok: true; post: CommunityPost }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const voterRes = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1`,
        [userId]
      );
      if ((voterRes.rowCount ?? 0) === 0) {
        return { ok: false, status: 404, error: 'Account not found.' };
      }

      const postRes = await client.query<PgPostRow>(
        `SELECT * FROM posts WHERE id = $1 FOR UPDATE`,
        [postId]
      );
      const p = postRes.rows[0];
      if (!p) {
        return { ok: false, status: 404, error: 'Post not found' };
      }

      const prevVoteRes = await client.query<{ vote: string }>(
        `SELECT vote FROM post_votes WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      const rawOld = prevVoteRes.rows[0]?.vote;
      const oldVote: 'up' | 'down' | null =
        rawOld === 'up' || rawOld === 'down' ? rawOld : null;

      let nextUpvotes = p.upvotes;
      if (oldVote !== voteType) {
        let diff = 0;
        if (oldVote === 'up') diff -= 1;
        if (oldVote === 'down') diff += 1;
        if (voteType === 'up') diff += 1;
        if (voteType === 'down') diff -= 1;
        nextUpvotes = p.upvotes + diff;

        await client.query(`UPDATE posts SET upvotes = $2 WHERE id = $1`, [postId, nextUpvotes]);

        if (voteType === null) {
          await client.query(
            `DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2`,
            [postId, userId]
          );
        } else {
          await client.query(
            `
            INSERT INTO post_votes (post_id, user_id, vote)
            VALUES ($1, $2, $3)
            ON CONFLICT (post_id, user_id) DO UPDATE SET vote = EXCLUDED.vote
            `,
            [postId, userId, voteType]
          );
        }
      }

      const persisted: PersistedCommunityPost = {
        id: p.id,
        title: p.title,
        author: p.author,
        authorRole: sanitizeAuthorRole(p.author_role),
        content: p.content,
        category: sanitizePostCategory(p.category),
        upvotes: nextUpvotes,
        userVote: p.user_vote === 'up' || p.user_vote === 'down' ? p.user_vote : null,
        votesByUserId: voteType ? { [userId]: voteType } : {},
        createdAt: p.created_at,
        commentsCount: p.comments_count,
      };

      return { ok: true, post: sanitizePostForClient(persisted, userId) };
    });
  }

  async getLabNotes(
    userId: string
  ): Promise<{ ok: true; labNotes: LabNote[] } | { ok: false; status: number; error: string }> {
    return this.withClient(async (client) => {
      const userCheck = await client.query<{ id: string }>(`SELECT id FROM users WHERE id = $1`, [
        userId,
      ]);
      if ((userCheck.rowCount ?? 0) === 0) {
        return { ok: false, status: 404, error: 'Account not found' };
      }
      const notesRes = await client.query<{
        id: string;
        module_id: string;
        module_title: string;
        title: string;
        content: string;
        last_saved: string;
      }>(
        `SELECT id, module_id, module_title, title, content, last_saved FROM lab_notes WHERE user_id = $1 ORDER BY last_saved DESC`,
        [userId]
      );
      return {
        ok: true,
        labNotes: notesRes.rows.map((n) => ({
          id: n.id,
          moduleId: n.module_id,
          moduleTitle: n.module_title,
          title: n.title,
          content: n.content,
          lastSaved: n.last_saved,
        })),
      };
    });
  }

  async saveLabNote(
    userId: string,
    rawNote: any
  ): Promise<{ ok: true; labNotes: LabNote[] } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userCheck = await client.query<{ id: string }>(`SELECT id FROM users WHERE id = $1`, [
        userId,
      ]);
      if ((userCheck.rowCount ?? 0) === 0) {
        return { ok: false, status: 404, error: 'Account not found' };
      }

      const existing = await client.query<{ user_id: string }>(
        `SELECT user_id FROM lab_notes WHERE id = $1 FOR UPDATE`,
        [rawNote.id]
      );
      if ((existing.rowCount ?? 0) > 0 && existing.rows[0].user_id !== userId) {
        return { ok: false, status: 403, error: 'Cannot modify a lab note owned by another user.' };
      }

      const moduleId =
        typeof rawNote.moduleId === 'string' && rawNote.moduleId.trim()
          ? rawNote.moduleId.trim()
          : 'general';
      const moduleTitle =
        typeof rawNote.moduleTitle === 'string' && rawNote.moduleTitle.trim()
          ? rawNote.moduleTitle.trim()
          : resolveLessonTitle(moduleId);
      const title =
        typeof rawNote.title === 'string' && rawNote.title.trim()
          ? rawNote.title.trim()
          : 'Untitled Note';
      const content = typeof rawNote.content === 'string' ? rawNote.content : '';
      const lastSaved =
        typeof rawNote.lastSaved === 'string' && rawNote.lastSaved.trim()
          ? rawNote.lastSaved.trim()
          : typeof rawNote.updatedAt === 'string' && rawNote.updatedAt.trim()
          ? rawNote.updatedAt.trim()
          : new Date().toISOString();

      await client.query(
        `
        INSERT INTO lab_notes (id, user_id, module_id, module_title, title, content, last_saved)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          module_id = EXCLUDED.module_id,
          module_title = EXCLUDED.module_title,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          last_saved = EXCLUDED.last_saved
        `,
        [rawNote.id, userId, moduleId, moduleTitle, title, content, lastSaved]
      );

      const notesRes = await client.query<{
        id: string;
        module_id: string;
        module_title: string;
        title: string;
        content: string;
        last_saved: string;
      }>(
        `SELECT id, module_id, module_title, title, content, last_saved FROM lab_notes WHERE user_id = $1 ORDER BY last_saved DESC`,
        [userId]
      );

      return {
        ok: true,
        labNotes: notesRes.rows.map((n) => ({
          id: n.id,
          moduleId: n.module_id,
          moduleTitle: n.module_title,
          title: n.title,
          content: n.content,
          lastSaved: n.last_saved,
        })),
      };
    });
  }

  async deleteLabNote(
    userId: string,
    noteId: string
  ): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userCheck = await client.query<{ id: string }>(`SELECT id FROM users WHERE id = $1`, [
        userId,
      ]);
      if ((userCheck.rowCount ?? 0) === 0) {
        return { ok: false, status: 404, error: 'Account not found' };
      }
      await client.query(`DELETE FROM lab_notes WHERE id = $1 AND user_id = $2`, [noteId, userId]);
      return { ok: true };
    });
  }

  async getTimelineEvents(): Promise<TimelineEvent[]> {
    return this.withClient(async (client) => {
      const res = await client.query<{
        id: string;
        username: string;
        action: string;
        xp_reward: number;
        timestamp: string;
      }>(`SELECT id, username, action, xp_reward, timestamp FROM timeline_events ORDER BY timestamp DESC, id DESC`);

      return res.rows.map((r) => ({
        id: r.id,
        username: r.username,
        action: r.action,
        xpReward: r.xp_reward,
        timestamp: r.timestamp,
      }));
    });
  }

  private async hydrateGroup(
    client: PoolClient,
    g: PgGroupRow,
    includeMessages = true
  ): Promise<Group> {
    const membersRes = await client.query<{ member_handle: string }>(
      `SELECT member_handle FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC, member_handle ASC`,
      [g.id]
    );
    const invRes = await client.query<{
      id: string;
      username: string;
      invited_by: string;
      created_at: string;
      expires_at: string;
    }>(`SELECT * FROM group_invitations WHERE group_id = $1 ORDER BY created_at ASC`, [g.id]);
    const reqRes = await client.query<{
      id: string;
      username: string;
      requested_at: string;
    }>(`SELECT * FROM group_join_requests WHERE group_id = $1 ORDER BY requested_at ASC`, [g.id]);
    const msgRes = includeMessages
      ? await client.query<{
          id: string;
          sender_id: string | null;
          sender_username: string;
          sender_role: string;
          content: string;
          created_at: string;
        }>(`SELECT * FROM group_messages WHERE group_id = $1 ORDER BY created_at ASC, id ASC`, [g.id])
      : { rows: [] };

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      avatar: g.avatar,
      visibility: g.visibility === 'public' ? 'public' : 'private',
      ...(g.owner_id ? { ownerId: g.owner_id } : {}),
      ownerHandle: g.owner_handle,
      members: membersRes.rows.map((m) => m.member_handle),
      invitations: invRes.rows.map<GroupInvitation>((inv) => ({
        id: inv.id,
        username: inv.username,
        invitedBy: inv.invited_by,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
      })),
      joinRequests: reqRes.rows.map<GroupJoinRequest>((r) => ({
        id: r.id,
        username: r.username,
        requestedAt: r.requested_at,
      })),
      messages: msgRes.rows.map<GroupMessage>((m) => ({
        id: m.id,
        ...(m.sender_id ? { senderId: m.sender_id } : {}),
        senderUsername: m.sender_username,
        senderRole: m.sender_role,
        content: m.content,
        createdAt: m.created_at,
      })),
      createdAt: g.created_at,
    };
  }

  private async syncGroupMembershipStateTx(client: PoolClient, group: Group): Promise<void> {
    // Sync members
    for (const handle of group.members || []) {
      const targetRow = await this.findUserByHandle(client, handle);
      await client.query(
        `
        INSERT INTO group_members (group_id, member_handle, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (group_id, member_handle) DO NOTHING
        `,
        [group.id, handle, targetRow?.id ?? null]
      );
    }

    // Sync invitations
    const invIds = (group.invitations || []).map((i) => i.id);
    if (invIds.length === 0) {
      await client.query(`DELETE FROM group_invitations WHERE group_id = $1`, [group.id]);
    } else {
      await client.query(
        `DELETE FROM group_invitations WHERE group_id = $1 AND NOT (id = ANY($2::text[]))`,
        [group.id, invIds]
      );
      for (const inv of group.invitations || []) {
        await client.query(
          `
          INSERT INTO group_invitations (id, group_id, username, invited_by, created_at, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
          `,
          [inv.id, group.id, inv.username, inv.invitedBy, inv.createdAt, inv.expiresAt]
        );
      }
    }

    // Sync joinRequests
    const reqIds = (group.joinRequests || []).map((r) => r.id);
    if (reqIds.length === 0) {
      await client.query(`DELETE FROM group_join_requests WHERE group_id = $1`, [group.id]);
    } else {
      await client.query(
        `DELETE FROM group_join_requests WHERE group_id = $1 AND NOT (id = ANY($2::text[]))`,
        [group.id, reqIds]
      );
      for (const reqItem of group.joinRequests || []) {
        await client.query(
          `
          INSERT INTO group_join_requests (id, group_id, username, requested_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
          `,
          [reqItem.id, group.id, reqItem.username, reqItem.requestedAt]
        );
      }
    }
  }

  async getGroupsForUser(
    userId: string
  ): Promise<{ ok: true; groups: Group[] } | { ok: false; status: number; error: string }> {
    return this.withClient(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const requesterUser = mapUserRowToUser(u, [], []);

      const groupsRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups ORDER BY created_at ASC, id ASC`
      );
      const hydrated = await Promise.all(
        groupsRes.rows.map((g) => this.hydrateGroup(client, g, true))
      );
      return {
        ok: true,
        groups: hydrated.map((g) => sanitizeGroupForUser(g, requesterUser)),
      };
    });
  }

  async getGroupDetailForUser(
    userId: string,
    groupId: string
  ): Promise<{ ok: true; group: Group } | { ok: false; status: number; error: string }> {
    return this.withClient(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const requesterUser = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(`SELECT * FROM groups WHERE id = $1`, [groupId]);
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      if (group.visibility !== 'public' && !isGroupMember(group, requesterUser)) {
        return {
          ok: false,
          status: 403,
          error: 'Private group details are restricted to authorized members.',
        };
      }
      return { ok: true, group: sanitizeGroupForUser(group, requesterUser) };
    });
  }

  async getGroupMessagesForUser(
    userId: string,
    groupId: string
  ): Promise<{ ok: true; messages: GroupMessage[] } | { ok: false; status: number; error: string }> {
    return this.withClient(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const requesterUser = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(`SELECT * FROM groups WHERE id = $1`, [groupId]);
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      if (!isGroupMember(group, requesterUser)) {
        return {
          ok: false,
          status: 403,
          error: 'Membership is required to retrieve group messages.',
        };
      }
      return { ok: true, messages: (group.messages || []).map(sanitizeGroupMessage) };
    });
  }

  async createGroup(
    userId: string,
    input: { name: string; description: string; avatar: string; visibility: 'public' | 'private' }
  ): Promise<{ ok: true; group: Group } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const creatorUser = mapUserRowToUser(u, [], []);

      const newGroup: Group = {
        id: `grp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        visibility: input.visibility,
        ownerId: creatorUser.id,
        ownerHandle: creatorUser.username,
        members: [creatorUser.username],
        invitations: [],
        joinRequests: [],
        messages: [],
        createdAt: new Date().toISOString(),
      };

      await client.query(
        `
        INSERT INTO groups (id, name, description, avatar, visibility, owner_id, owner_handle, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          newGroup.id,
          newGroup.name,
          newGroup.description,
          newGroup.avatar,
          newGroup.visibility,
          newGroup.ownerId ?? null,
          newGroup.ownerHandle,
          newGroup.createdAt,
        ]
      );

      await client.query(
        `
        INSERT INTO group_members (group_id, member_handle, user_id)
        VALUES ($1, $2, $3)
        `,
        [newGroup.id, creatorUser.username, creatorUser.id]
      );

      return { ok: true, group: sanitizeGroupForUser(newGroup, creatorUser) };
    });
  }

  async joinPublicGroup(
    userId: string,
    groupId: string
  ): Promise<{ ok: true; group: Group } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const actor = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      if (isGroupMember(group, actor)) {
        return { ok: false, status: 409, error: 'You are already a member of this group.' };
      }
      if (group.visibility !== 'public') {
        return {
          ok: false,
          status: 403,
          error: 'Private groups cannot be self-joined. Request access or accept an owner invitation.',
        };
      }

      addMemberDeduplicated(group, actor.username);
      const selfNorm = normalizeHandle(actor.username);
      group.invitations = pruneExpiredInvitations(group.invitations).filter(
        (inv) => normalizeHandle(inv.username) !== selfNorm
      );
      group.joinRequests = (group.joinRequests || []).filter(
        (r) => normalizeHandle(r.username) !== selfNorm
      );

      await this.syncGroupMembershipStateTx(client, group);
      return { ok: true, group: sanitizeGroupForUser(group, actor) };
    });
  }

  async createGroupInvitation(
    userId: string,
    groupId: string,
    targetHandleRaw: string
  ): Promise<
    | { ok: true; invitation: GroupInvitation; group: Group }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const requester = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      if (!isGroupOwner(group, requester)) {
        return { ok: false, status: 403, error: 'Only the group owner can issue invitations.' };
      }

      const targetRow = await this.findUserByHandle(client, targetHandleRaw);
      if (!targetRow) {
        return { ok: false, status: 404, error: 'Target operator handle was not found.' };
      }

      const targetAccountStub = {
        user: mapUserRowToUser(targetRow, [], []),
      } as AccountRecord;

      const created = createGroupInvitationRecord(group, requester, targetAccountStub);
      if (created.ok === false) {
        return { ok: false, status: created.status, error: created.error };
      }

      await this.syncGroupMembershipStateTx(client, group);
      return {
        ok: true,
        invitation: created.invitation,
        group: sanitizeGroupForUser(group, requester),
      };
    });
  }

  async respondGroupInvitation(
    userId: string,
    groupId: string,
    action: 'accept' | 'decline'
  ): Promise<
    | { ok: true; accepted: boolean; group: Group }
    | { ok: false; status: number; error: string }
  > {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const actor = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      const selfNorm = normalizeHandle(actor.username);
      const existingInv = (group.invitations || []).find(
        (inv) => normalizeHandle(inv.username) === selfNorm
      );

      if (!existingInv) {
        return { ok: false, status: 403, error: 'You do not have an invitation for this group.' };
      }

      const expMs = Date.parse(existingInv.expiresAt);
      const isExpired = !Number.isFinite(expMs) || expMs <= Date.now();
      group.invitations = pruneExpiredInvitations(group.invitations).filter(
        (inv) => normalizeHandle(inv.username) !== selfNorm
      );

      if (isExpired) {
        await this.syncGroupMembershipStateTx(client, group);
        return {
          ok: false,
          status: 410,
          error: 'This invitation has expired. Ask the group owner for a new invitation.',
        };
      }

      if (action === 'accept') {
        addMemberDeduplicated(group, actor.username);
        group.joinRequests = (group.joinRequests || []).filter(
          (r) => normalizeHandle(r.username) !== selfNorm
        );
      }

      await this.syncGroupMembershipStateTx(client, group);
      return {
        ok: true,
        accepted: action === 'accept',
        group: sanitizeGroupForUser(group, actor),
      };
    });
  }

  async createGroupJoinRequest(
    userId: string,
    groupId: string
  ): Promise<{ ok: true; group: Group } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const actor = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      const created = createJoinRequestRecord(group, actor);
      if (created.ok === false) {
        return { ok: false, status: created.status, error: created.error };
      }

      await this.syncGroupMembershipStateTx(client, group);
      return { ok: true, group: sanitizeGroupForUser(group, actor) };
    });
  }

  async respondGroupJoinRequest(
    userId: string,
    groupId: string,
    requesterHandle: string,
    action: 'approve' | 'reject'
  ): Promise<{ ok: true; group: Group } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const ownerUser = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Community group not found' };

      const group = await this.hydrateGroup(client, gRow, true);
      if (!isGroupOwner(group, ownerUser)) {
        return {
          ok: false,
          status: 403,
          error: 'Only the group owner can approve or reject join requests.',
        };
      }

      const targetNorm = normalizeHandle(requesterHandle);
      const pending = (group.joinRequests || []).find(
        (r) => normalizeHandle(r.username) === targetNorm
      );
      if (!pending) {
        return { ok: false, status: 404, error: 'No matching pending join request was found.' };
      }

      group.joinRequests = (group.joinRequests || []).filter(
        (r) => normalizeHandle(r.username) !== targetNorm
      );

      if (action === 'approve') {
        const targetRow = await this.findUserByHandle(client, requesterHandle);
        if (!targetRow) {
          await this.syncGroupMembershipStateTx(client, group);
          return { ok: false, status: 404, error: 'Requesting account no longer exists.' };
        }
        addMemberDeduplicated(group, targetRow.username);
        group.invitations = pruneExpiredInvitations(group.invitations).filter(
          (inv) => normalizeHandle(inv.username) !== targetNorm
        );
      }

      await this.syncGroupMembershipStateTx(client, group);
      return { ok: true, group: sanitizeGroupForUser(group, ownerUser) };
    });
  }

  async manageGroupMember(
    userId: string,
    groupId: string,
    targetHandleRaw: string
  ): Promise<{ status: number; body: Record<string, any> }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { status: 404, body: { error: 'Account not found' } };
      const requester = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { status: 404, body: { error: 'Community group not found' } };

      const group = await this.hydrateGroup(client, gRow, true);
      const targetNorm = normalizeHandle(targetHandleRaw);
      const isSelf = targetNorm === normalizeHandle(requester.username);
      const owner = isGroupOwner(group, requester);

      if (isSelf) {
        if (group.visibility !== 'public') {
          return {
            status: 403,
            body: {
              error:
                'Private groups cannot be self-joined. Request access or accept an owner invitation.',
            },
          };
        }
        if (isGroupMember(group, requester)) {
          return { status: 409, body: { error: 'You are already a member of this group.' } };
        }
        addMemberDeduplicated(group, requester.username);
        await this.syncGroupMembershipStateTx(client, group);
        return { status: 200, body: sanitizeGroupForUser(group, requester) };
      }

      if (!owner) {
        return {
          status: 403,
          body: { error: 'Only the group owner can invite or add other members.' },
        };
      }

      const targetRow = await this.findUserByHandle(client, targetHandleRaw);
      if (!targetRow) {
        return { status: 404, body: { error: 'Target operator handle was not found.' } };
      }

      const hasPendingReq = (group.joinRequests || []).some(
        (r) => normalizeHandle(r.username) === targetNorm
      );
      if (hasPendingReq) {
        group.joinRequests = (group.joinRequests || []).filter(
          (r) => normalizeHandle(r.username) !== targetNorm
        );
        addMemberDeduplicated(group, targetRow.username);
        group.invitations = pruneExpiredInvitations(group.invitations).filter(
          (inv) => normalizeHandle(inv.username) !== targetNorm
        );
        await this.syncGroupMembershipStateTx(client, group);
        return { status: 200, body: sanitizeGroupForUser(group, requester) };
      }

      const targetAccountStub = {
        user: mapUserRowToUser(targetRow, [], []),
      } as AccountRecord;
      const created = createGroupInvitationRecord(group, requester, targetAccountStub);
      if (created.ok === false) {
        return { status: created.status, body: { error: created.error } };
      }

      await this.syncGroupMembershipStateTx(client, group);
      return { status: 201, body: sanitizeGroupForUser(group, requester) };
    });
  }

  async sendGroupMessage(
    userId: string,
    groupId: string,
    cleanContent: string
  ): Promise<{ ok: true; message: GroupMessage } | { ok: false; status: number; error: string }> {
    return this.withTx(async (client) => {
      const userRes = await client.query<PgUserRow>(`SELECT * FROM users WHERE id = $1`, [userId]);
      const u = userRes.rows[0];
      if (!u) return { ok: false, status: 404, error: 'Account not found' };
      const sender = mapUserRowToUser(u, [], []);

      const grpRes = await client.query<PgGroupRow>(
        `SELECT * FROM groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );
      const gRow = grpRes.rows[0];
      if (!gRow) return { ok: false, status: 404, error: 'Group not found.' };

      const group = await this.hydrateGroup(client, gRow, false);
      if (!isGroupMember(group, sender)) {
        return {
          ok: false,
          status: 403,
          error: 'Membership is required to send messages in this group.',
        };
      }

      const newMessage: GroupMessage = {
        id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        senderId: sender.id,
        senderUsername: sender.username,
        senderRole: sender.rank.split(' ')[0] || 'Cadet',
        content: cleanContent,
        createdAt: new Date().toISOString(),
      };

      await client.query(
        `
        INSERT INTO group_messages (id, group_id, sender_id, sender_username, sender_role, content, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          newMessage.id,
          groupId,
          sender.id,
          newMessage.senderUsername,
          newMessage.senderRole,
          newMessage.content,
          newMessage.createdAt,
        ]
      );

      return { ok: true, message: sanitizeGroupMessage(newMessage) };
    });
  }
}
