import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema.ts';
import {
  assertConfirmedDevNeonBranch,
  CONFIRMED_DEV_NEON_BRANCH_ID,
  CONFIRMED_DEV_NEON_PROJECT_ID,
} from '../db/client.ts';
import { CURRENT_PROGRESS_SCHEMA_VERSION } from '../data/curriculumMetadata.ts';
import { normalizeLearningProfile } from '../lib/learningProfile.ts';
import type {
  CapstoneProgressMap,
  Group,
  LabExplorationMap,
  LabNote,
  PersistedCommunityPost,
  TimelineEvent,
} from '../types.ts';
import { isScryptHash, validateSessionSecretStrength } from './auth.ts';
import { DbSchema, sanitizeDbCredentialsForBackup } from './migration.ts';

export interface RecoveryContext {
  projectId: string;
  branchId: string;
  snapshotKey: string;
}

export interface RecoverySnapshotSummary {
  accountCount: number;
  scryptHashCount: number;
  aggregateXp: number;
  completedLessonsCount: number;
  labNotesCount: number;
  postsCount: number;
  groupsCount: number;
  groupMessagesCount: number;
  timelineEventsCount: number;
}

export interface EncryptedRecoveryEnvelope {
  version: 1;
  snapshotKey: string;
  sourceProjectId: string;
  sourceBranchId: string;
  algorithm: 'aes-256-gcm';
  kdf: 'hkdf-sha256';
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  plaintextSha256: string;
  summary: RecoverySnapshotSummary;
  createdAt: string;
}

function deriveRecoveryAesKey(secret: string, salt: Buffer, context: RecoveryContext): Buffer {
  const secretCheck = validateSessionSecretStrength(secret);
  if (secretCheck.valid === false) {
    throw new Error(`Cannot derive encrypted backup key: ${secretCheck.reason}`);
  }
  const info = `cfa-recovery-backup-v1:${context.projectId}:${context.branchId}:${context.snapshotKey}`;
  const derived = crypto.hkdfSync(
    'sha256',
    Buffer.from(secretCheck.secret, 'utf8'),
    salt,
    Buffer.from(info, 'utf8'),
    32
  );
  return Buffer.from(derived);
}

function buildEnvelopeAad(context: RecoveryContext, plaintextSha256: string): Buffer {
  return Buffer.from(
    `${context.projectId}|${context.branchId}|${context.snapshotKey}|${plaintextSha256}`,
    'utf8'
  );
}

export function summarizeDbSchemaForRecovery(dbData: DbSchema): RecoverySnapshotSummary {
  const accounts = dbData.accounts || [];
  let scryptHashCount = 0;
  let aggregateXp = 0;
  let completedLessonsCount = 0;
  let labNotesCount = 0;

  for (const acc of accounts) {
    if (isScryptHash(acc.passwordHash)) scryptHashCount++;
    aggregateXp += acc.progress?.xp ?? acc.user?.xp ?? 0;
    completedLessonsCount += (acc.progress?.completedLessonIds || []).length;
    labNotesCount += (acc.labNotes || []).length;
  }

  const groups = dbData.groups || [];
  let groupMessagesCount = 0;
  for (const grp of groups) {
    groupMessagesCount += (grp.messages || []).length;
  }

  return {
    accountCount: accounts.length,
    scryptHashCount,
    aggregateXp,
    completedLessonsCount,
    labNotesCount,
    postsCount: (dbData.posts || []).length,
    groupsCount: groups.length,
    groupMessagesCount,
    timelineEventsCount: (dbData.timelineEvents || []).length,
  };
}

export async function exportDbSchemaFromPostgres(
  db: NodePgDatabase<typeof schema>
): Promise<DbSchema> {
  const [
    pgUsers,
    pgProgress,
    pgXpEvents,
    pgPostXpDaily,
    pgFollows,
    pgLabExploration,
    pgCapstoneProgress,
    pgLabNotes,
    pgPosts,
    pgPostVotes,
    pgGroups,
    pgGroupMembers,
    pgGroupInvitations,
    pgGroupJoinRequests,
    pgGroupMessages,
    pgTimelineEvents,
    pgRevokedSessions,
  ] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.userProgress),
    db.select().from(schema.xpEvents),
    db.select().from(schema.postXpDailyTotals),
    db.select().from(schema.userFollows),
    db.select().from(schema.labExploration),
    db.select().from(schema.capstoneProgress),
    db.select().from(schema.labNotes),
    db.select().from(schema.posts),
    db.select().from(schema.postVotes),
    db.select().from(schema.groups),
    db.select().from(schema.groupMembers),
    db.select().from(schema.groupInvitations),
    db.select().from(schema.groupJoinRequests),
    db.select().from(schema.groupMessages),
    db.select().from(schema.timelineEvents),
    db.select().from(schema.revokedSessions),
  ]);

  const progressByUser = new Map(pgProgress.map((p) => [p.userId, p]));
  const sortedUsers = [...pgUsers].sort((a, b) => a.id.localeCompare(b.id));
  const usernameById = new Map(sortedUsers.map((u) => [u.id, u.username]));

  const accounts: DbSchema['accounts'] = sortedUsers.map((u) => {
    const prog = progressByUser.get(u.id);
    const userXpEvents = pgXpEvents
      .filter((ev) => ev.userId === u.id)
      .map((ev) => ev.eventId)
      .sort();

    const postXpDailyLog: Record<string, number> = {};
    for (const d of pgPostXpDaily.filter((row) => row.userId === u.id)) {
      postXpDailyLog[d.dateKey] = d.xpAwarded;
    }

    const following = pgFollows
      .filter((f) => f.followerUserId === u.id && f.recordedInFollowing)
      .map((f) => f.followedHandle);

    const followers = pgFollows
      .filter((f) => f.followedUserId === u.id && f.recordedInTargetFollowers)
      .map((f) => usernameById.get(f.followerUserId) || '')
      .filter(Boolean);

    const userNotes: LabNote[] = pgLabNotes
      .filter((n) => n.userId === u.id)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => ({
        id: n.id,
        moduleId: n.moduleId,
        moduleTitle: n.moduleTitle,
        title: n.title,
        content: n.content,
        lastSaved: n.lastSaved,
      }));

    const labExplorationMap: LabExplorationMap = {};
    for (const exp of pgLabExploration.filter((e) => e.userId === u.id)) {
      labExplorationMap[exp.labId] = {
        exploredDiagramIds: [...(exp.exploredDiagramIds || [])],
        executedTerminalCommands: [...(exp.executedTerminalCommands || [])],
        logTargetVerified: Boolean(exp.logTargetVerified),
        verifiedLogEntryId: exp.verifiedLogEntryId ?? null,
        scenarioVerified: Boolean(exp.scenarioVerified),
        verifiedHighlightLines: [...(exp.verifiedHighlightLines || [])],
        explorationComplete: Boolean(exp.explorationComplete),
      };
    }

    const capstoneMap: CapstoneProgressMap = {};
    for (const cap of pgCapstoneProgress.filter((c) => c.userId === u.id)) {
      capstoneMap[cap.capstoneId] = {
        capstoneId: cap.capstoneId,
        currentStageId: cap.currentStageId,
        stages: cap.stages || {},
        reportSubmitted: Boolean(cap.reportSubmitted),
        ...(cap.reportScore !== null ? { reportScore: cap.reportScore } : {}),
        ...(cap.maxReportScore !== null ? { maxReportScore: cap.maxReportScore } : {}),
        ...(cap.rubricBreakdown ? { rubricBreakdown: cap.rubricBreakdown } : {}),
        ...(cap.lastSubmissionSections ? { lastSubmissionSections: cap.lastSubmissionSections } : {}),
        ...(cap.detailedSolutionExplanation
          ? { detailedSolutionExplanation: cap.detailedSolutionExplanation }
          : {}),
        ...(cap.completedAt ? { completedAt: cap.completedAt } : {}),
      };
    }

    return {
      email: u.email,
      passwordHash: u.passwordHash,
      tokenVersion: u.tokenVersion,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        streak: u.streak,
        lastActiveDate: u.lastActiveDate ?? null,
        xp: u.xp,
        rank: u.rank,
        level: u.level,
        completion: u.completion,
        verifiedTopics: [...(u.verifiedTopics || [])],
        following,
        followers,
        lastStreakUpdate: u.lastStreakUpdate ?? null,
        lastActiveTimestamp: u.lastActiveTimestamp ?? null,
        learningProfile: normalizeLearningProfile(u.learningProfile),
      },
      progress: {
        schemaVersion: prog?.schemaVersion ?? CURRENT_PROGRESS_SCHEMA_VERSION,
        completedLessonIds: [...(prog?.completedLessonIds || [])],
        completedExerciseIds: [...(prog?.completedExerciseIds || [])],
        completedQuizLessonIds: [...(prog?.completedQuizLessonIds || [])],
        completedHomeworkLessonIds: [...(prog?.completedHomeworkLessonIds || [])],
        legacyCompletedLessonIds: [...(prog?.legacyCompletedLessonIds || [])],
        awardedXpEventIds: userXpEvents,
        ...(Object.keys(postXpDailyLog).length > 0 ? { postXpDailyLog } : {}),
        xp: prog?.xp ?? u.xp,
        streak: prog?.streak ?? u.streak,
        lastActiveDate: prog?.lastActiveDate ?? u.lastActiveDate ?? null,
        lastStreakUpdate: prog?.lastStreakUpdate ?? u.lastStreakUpdate ?? null,
        lastActiveTimestamp: prog?.lastActiveTimestamp ?? u.lastActiveTimestamp ?? null,
        ...(prog?.lastSyncedAt ? { lastSyncedAt: prog.lastSyncedAt } : {}),
        ...(prog?.updatedAt ? { updatedAt: prog.updatedAt } : {}),
      },
      labNotes: userNotes,
      ...(Object.keys(labExplorationMap).length > 0 ? { labExploration: labExplorationMap } : {}),
      ...(Object.keys(capstoneMap).length > 0 ? { capstoneProgress: capstoneMap } : {}),
    };
  });

  const posts: PersistedCommunityPost[] = [...pgPosts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => {
      const votesByUserId: Record<string, 'up' | 'down'> = {};
      for (const v of pgPostVotes.filter((row) => row.postId === p.id)) {
        if (v.vote === 'up' || v.vote === 'down') {
          votesByUserId[v.userId] = v.vote;
        }
      }
      return {
        id: p.id,
        title: p.title,
        author: p.author,
        authorRole: (
          ['Cadet', 'Operator', 'Infiltrator', 'Instructor'].includes(p.authorRole)
            ? p.authorRole
            : 'Cadet'
        ) as PersistedCommunityPost['authorRole'],
        content: p.content,
        category: (
          ['General', 'Help', 'Defensive', 'Offensive', 'Certifications'].includes(p.category)
            ? p.category
            : 'General'
        ) as PersistedCommunityPost['category'],
        upvotes: p.upvotes,
        userVote: p.userVote === 'up' || p.userVote === 'down' ? p.userVote : null,
        ...(Object.keys(votesByUserId).length > 0 ? { votesByUserId } : {}),
        createdAt: p.createdAt,
        commentsCount: p.commentsCount,
      };
    });

  const groups: Group[] = [...pgGroups]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      avatar: g.avatar,
      visibility: g.visibility === 'public' ? 'public' : 'private',
      ...(g.ownerId ? { ownerId: g.ownerId } : {}),
      ownerHandle: g.ownerHandle,
      members: pgGroupMembers
        .filter((m) => m.groupId === g.id)
        .map((m) => m.memberHandle),
      invitations: pgGroupInvitations
        .filter((inv) => inv.groupId === g.id)
        .map((inv) => ({
          id: inv.id,
          username: inv.username,
          invitedBy: inv.invitedBy,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        })),
      joinRequests: pgGroupJoinRequests
        .filter((req) => req.groupId === g.id)
        .map((req) => ({
          id: req.id,
          username: req.username,
          requestedAt: req.requestedAt,
        })),
      messages: pgGroupMessages
        .filter((m) => m.groupId === g.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((m) => ({
          id: m.id,
          ...(m.senderId ? { senderId: m.senderId } : {}),
          senderUsername: m.senderUsername,
          senderRole: m.senderRole,
          content: m.content,
          createdAt: m.createdAt,
        })),
      createdAt: g.createdAt,
    }));

  const timelineEvents: TimelineEvent[] = [...pgTimelineEvents]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((t) => ({
      id: t.id,
      username: t.username,
      action: t.action,
      xpReward: t.xpReward,
      timestamp: t.timestamp,
    }));

  return {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    accounts,
    posts,
    timelineEvents,
    groups,
    revokedSessions: pgRevokedSessions.map((r) => ({ sid: r.sid, exp: r.exp })),
  };
}

export function encryptRecoveryPayload(
  dbData: DbSchema,
  context: RecoveryContext,
  secret: string
): EncryptedRecoveryEnvelope {
  const { db: sanitized } = sanitizeDbCredentialsForBackup(dbData);
  const plaintext = JSON.stringify(sanitized);
  const plaintextBuf = Buffer.from(plaintext, 'utf8');
  const plaintextSha256 = crypto.createHash('sha256').update(plaintextBuf).digest('hex');

  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = deriveRecoveryAesKey(secret, salt, context);
  const aad = buildEnvelopeAad(context, plaintextSha256);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    snapshotKey: context.snapshotKey,
    sourceProjectId: context.projectId,
    sourceBranchId: context.branchId,
    algorithm: 'aes-256-gcm',
    kdf: 'hkdf-sha256',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    plaintextSha256,
    summary: summarizeDbSchemaForRecovery(sanitized as DbSchema),
    createdAt: new Date().toISOString(),
  };
}

export function decryptRecoveryPayload(
  envelope: EncryptedRecoveryEnvelope,
  expectedContext: Pick<RecoveryContext, 'projectId' | 'branchId'> & { snapshotKey?: string },
  secret: string
): { db: DbSchema; plaintextSha256: string; verifiedSummary: RecoverySnapshotSummary } {
  if (!envelope || envelope.algorithm !== 'aes-256-gcm' || envelope.kdf !== 'hkdf-sha256') {
    throw new Error('Unsupported or malformed recovery envelope algorithm.');
  }
  if (envelope.sourceProjectId !== expectedContext.projectId) {
    throw new Error(
      `Recovery envelope project mismatch: expected ${expectedContext.projectId}, got ${envelope.sourceProjectId}.`
    );
  }
  if (envelope.sourceBranchId !== expectedContext.branchId) {
    throw new Error(
      `Recovery envelope branch mismatch: expected ${expectedContext.branchId}, got ${envelope.sourceBranchId}.`
    );
  }
  if (expectedContext.snapshotKey && envelope.snapshotKey !== expectedContext.snapshotKey) {
    throw new Error('Recovery envelope snapshotKey mismatch.');
  }

  const salt = Buffer.from(envelope.salt, 'hex');
  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.authTag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'hex');

  if (salt.length < 16 || iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
    throw new Error('Malformed encrypted recovery envelope byte lengths.');
  }

  const context: RecoveryContext = {
    projectId: envelope.sourceProjectId,
    branchId: envelope.sourceBranchId,
    snapshotKey: envelope.snapshotKey,
  };
  const key = deriveRecoveryAesKey(secret, salt, context);
  const aad = buildEnvelopeAad(context, envelope.plaintextSha256);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const actualSha256 = crypto.createHash('sha256').update(plaintextBuf).digest('hex');
  if (actualSha256 !== envelope.plaintextSha256) {
    throw new Error('Decrypted recovery payload SHA-256 checksum mismatch.');
  }

  const parsed = JSON.parse(plaintextBuf.toString('utf8')) as DbSchema;
  if (!parsed || !Array.isArray(parsed.accounts)) {
    throw new Error('Decrypted recovery payload is not a valid DbSchema.');
  }

  const verifiedSummary = summarizeDbSchemaForRecovery(parsed);
  return {
    db: parsed,
    plaintextSha256: actualSha256,
    verifiedSummary,
  };
}

export async function createAndStoreEncryptedNeonBackup(
  pool: Pool,
  db: NodePgDatabase<typeof schema>,
  secret: string,
  options?: { snapshotKey?: string; reason?: string }
): Promise<{
  snapshotKey: string;
  sourceProjectId: string;
  sourceBranchId: string;
  algorithm: 'aes-256-gcm';
  kdf: 'hkdf-sha256';
  plaintextSha256: string;
  ciphertextBytes: number;
  summary: RecoverySnapshotSummary;
  createdAt: string;
}> {
  const client = await pool.connect();
  let identity;
  try {
    identity = await assertConfirmedDevNeonBranch(client);
  } finally {
    client.release();
  }

  const exported = await exportDbSchemaFromPostgres(db);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotKey =
    options?.snapshotKey?.trim() ||
    `neon-dev-baseline-${stamp}-${crypto.randomBytes(4).toString('hex')}`;

  const envelope = encryptRecoveryPayload(
    exported,
    {
      projectId: identity.projectId,
      branchId: identity.branchId,
      snapshotKey,
    },
    secret
  );

  const [inserted] = await db
    .insert(schema.recoverySnapshots)
    .values({
      snapshotKey: envelope.snapshotKey,
      sourceProjectId: envelope.sourceProjectId,
      sourceBranchId: envelope.sourceBranchId,
      algorithm: envelope.algorithm,
      kdf: envelope.kdf,
      salt: envelope.salt,
      iv: envelope.iv,
      authTag: envelope.authTag,
      ciphertext: envelope.ciphertext,
      plaintextSha256: envelope.plaintextSha256,
      accountCount: envelope.summary.accountCount,
      aggregateXp: envelope.summary.aggregateXp,
      completedLessonsCount: envelope.summary.completedLessonsCount,
      summary: {
        ...envelope.summary,
        reason: options?.reason || 'baseline-protection',
      },
    })
    .onConflictDoUpdate({
      target: schema.recoverySnapshots.snapshotKey,
      set: {
        salt: envelope.salt,
        iv: envelope.iv,
        authTag: envelope.authTag,
        ciphertext: envelope.ciphertext,
        plaintextSha256: envelope.plaintextSha256,
        accountCount: envelope.summary.accountCount,
        aggregateXp: envelope.summary.aggregateXp,
        completedLessonsCount: envelope.summary.completedLessonsCount,
        summary: {
          ...envelope.summary,
          reason: options?.reason || 'baseline-protection',
        },
      },
    })
    .returning();

  return {
    snapshotKey: envelope.snapshotKey,
    sourceProjectId: envelope.sourceProjectId,
    sourceBranchId: envelope.sourceBranchId,
    algorithm: envelope.algorithm,
    kdf: envelope.kdf,
    plaintextSha256: envelope.plaintextSha256,
    ciphertextBytes: Buffer.byteLength(envelope.ciphertext, 'hex'),
    summary: envelope.summary,
    createdAt: inserted.createdAt.toISOString(),
  };
}

export async function verifyLatestEncryptedNeonBackup(
  pool: Pool,
  db: NodePgDatabase<typeof schema>,
  secret: string,
  snapshotKey?: string
): Promise<{
  ok: boolean;
  snapshotKey: string;
  plaintextSha256: string;
  decryptedSummary: RecoverySnapshotSummary;
  liveSummary: RecoverySnapshotSummary;
  parityMatchesLivePg: boolean;
}> {
  const client = await pool.connect();
  let identity;
  try {
    identity = await assertConfirmedDevNeonBranch(client);
  } finally {
    client.release();
  }

  const rows = snapshotKey
    ? await db
        .select()
        .from(schema.recoverySnapshots)
        .where(eq(schema.recoverySnapshots.snapshotKey, snapshotKey))
        .limit(1)
    : await db
        .select()
        .from(schema.recoverySnapshots)
        .orderBy(desc(schema.recoverySnapshots.createdAt), desc(schema.recoverySnapshots.id))
        .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error('No encrypted recovery snapshot found in recovery_snapshots.');
  }

  const envelope: EncryptedRecoveryEnvelope = {
    version: 1,
    snapshotKey: row.snapshotKey,
    sourceProjectId: row.sourceProjectId,
    sourceBranchId: row.sourceBranchId,
    algorithm: row.algorithm as 'aes-256-gcm',
    kdf: row.kdf as 'hkdf-sha256',
    salt: row.salt,
    iv: row.iv,
    authTag: row.authTag,
    ciphertext: row.ciphertext,
    plaintextSha256: row.plaintextSha256,
    summary: {
      accountCount: row.accountCount,
      scryptHashCount: Number((row.summary as any)?.scryptHashCount ?? row.accountCount),
      aggregateXp: row.aggregateXp,
      completedLessonsCount: row.completedLessonsCount,
      labNotesCount: Number((row.summary as any)?.labNotesCount ?? 0),
      postsCount: Number((row.summary as any)?.postsCount ?? 0),
      groupsCount: Number((row.summary as any)?.groupsCount ?? 0),
      groupMessagesCount: Number((row.summary as any)?.groupMessagesCount ?? 0),
      timelineEventsCount: Number((row.summary as any)?.timelineEventsCount ?? 0),
    },
    createdAt: row.createdAt.toISOString(),
  };

  const decrypted = decryptRecoveryPayload(
    envelope,
    {
      projectId: identity.projectId || CONFIRMED_DEV_NEON_PROJECT_ID,
      branchId: identity.branchId || CONFIRMED_DEV_NEON_BRANCH_ID,
      snapshotKey: row.snapshotKey,
    },
    secret
  );

  const liveExport = await exportDbSchemaFromPostgres(db);
  const liveSummary = summarizeDbSchemaForRecovery(liveExport);
  const parityMatchesLivePg =
    decrypted.verifiedSummary.accountCount === liveSummary.accountCount &&
    decrypted.verifiedSummary.scryptHashCount === liveSummary.scryptHashCount &&
    decrypted.verifiedSummary.aggregateXp === liveSummary.aggregateXp &&
    decrypted.verifiedSummary.completedLessonsCount === liveSummary.completedLessonsCount &&
    decrypted.verifiedSummary.labNotesCount === liveSummary.labNotesCount &&
    decrypted.verifiedSummary.postsCount === liveSummary.postsCount &&
    decrypted.verifiedSummary.groupsCount === liveSummary.groupsCount &&
    decrypted.verifiedSummary.groupMessagesCount === liveSummary.groupMessagesCount &&
    decrypted.verifiedSummary.timelineEventsCount === liveSummary.timelineEventsCount;

  return {
    ok: parityMatchesLivePg && decrypted.verifiedSummary.scryptHashCount === decrypted.verifiedSummary.accountCount,
    snapshotKey: row.snapshotKey,
    plaintextSha256: decrypted.plaintextSha256,
    decryptedSummary: decrypted.verifiedSummary,
    liveSummary,
    parityMatchesLivePg,
  };
}

export function writeEncryptedBackupFile(filePath: string, envelope: EncryptedRecoveryEnvelope): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  const content = JSON.stringify(envelope, null, 2);
  fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

export function readAndDecryptBackupFile(
  filePath: string,
  expectedContext: Pick<RecoveryContext, 'projectId' | 'branchId'> & { snapshotKey?: string },
  secret: string
): { db: DbSchema; plaintextSha256: string; verifiedSummary: RecoverySnapshotSummary } {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as EncryptedRecoveryEnvelope;
  return decryptRecoveryPayload(parsed, expectedContext, secret);
}
