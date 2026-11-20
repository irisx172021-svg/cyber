import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isDeepStrictEqual } from 'util';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema.ts';
import {
  assertConfirmedDevNeonBranch,
  createDrizzleDb,
  createNeonPool,
  redactPgSecrets,
} from '../src/db/client.ts';
import { isScryptHash } from '../src/server/auth.ts';
import { DbSchema } from '../src/server/migration.ts';
import { normalizeHandle } from '../src/server/groups.ts';

export const EXPECTED_BASELINE_SHA256 =
  'd94730b1aad0ae5434c29d23832e3ab77740fe8705fef0ce0d28dd99bd5485a3';
export const DEFAULT_SOURCE_DB_PATH = path.resolve(process.cwd(), 'database.json');
export const DEFAULT_BACKUP_DB_PATH = path.resolve(
  process.cwd(),
  'backups/pre-phase2.5p2a-20261120-060400/database.pre-phase2.5p2a.json'
);

export interface SourceMetrics {
  schemaVersion: number;
  accountsCount: number;
  scryptHashCount: number;
  aggregateXp: number;
  completedLessonsCount: number;
  completedExercisesCount: number;
  completedQuizLessonsCount: number;
  completedHomeworkLessonsCount: number;
  legacyCompletedLessonsCount: number;
  xpEventsCount: number;
  postXpDailyTotalsCount: number;
  userFollowsCount: number;
  labExplorationCount: number;
  capstoneProgressCount: number;
  labNotesCount: number;
  postsCount: number;
  postVotesCount: number;
  groupsCount: number;
  groupMembersCount: number;
  groupInvitationsCount: number;
  groupJoinRequestsCount: number;
  groupMessagesCount: number;
  timelineEventsCount: number;
  revokedSessionsCount: number;
  learningProfilesCount: number;
}

export interface MigrationPlanCounts {
  users: number;
  user_progress: number;
  xp_events: number;
  post_xp_daily_totals: number;
  user_follows: number;
  lab_exploration: number;
  capstone_progress: number;
  lab_notes: number;
  posts: number;
  post_votes: number;
  groups: number;
  group_members: number;
  group_invitations: number;
  group_join_requests: number;
  group_messages: number;
  timeline_events: number;
  revoked_sessions: number;
  migration_history: number;
}

export function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function loadValidatedSourceJson(sourcePath = DEFAULT_SOURCE_DB_PATH): {
  db: DbSchema;
  sha256: string;
  metrics: SourceMetrics;
} {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source JSON database not found at ${sourcePath}`);
  }
  const sha256 = sha256File(sourcePath);
  const rawText = fs.readFileSync(sourcePath, 'utf-8');
  const parsed = JSON.parse(rawText) as DbSchema;

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.accounts)) {
    throw new Error('Source database JSON is malformed or missing accounts array.');
  }

  for (const acc of parsed.accounts) {
    if (!acc?.user?.id || !acc?.email || !acc?.user?.username) {
      throw new Error('Source database contains an account missing id, email, or username.');
    }
    if (!isScryptHash(acc.passwordHash)) {
      throw new Error(
        `Refusing migration: account ${acc.user.id} does not have a valid salted scrypt passwordHash.`
      );
    }
  }

  const metrics = computeSourceMetrics(parsed);
  return { db: parsed, sha256, metrics };
}

export function computeSourceMetrics(db: DbSchema): SourceMetrics {
  const accounts = db.accounts || [];
  let scryptHashCount = 0;
  let aggregateXp = 0;
  let completedLessonsCount = 0;
  let completedExercisesCount = 0;
  let completedQuizLessonsCount = 0;
  let completedHomeworkLessonsCount = 0;
  let legacyCompletedLessonsCount = 0;
  let xpEventsCount = 0;
  let postXpDailyTotalsCount = 0;
  let userFollowsCount = 0;
  let labExplorationCount = 0;
  let capstoneProgressCount = 0;
  let labNotesCount = 0;
  let learningProfilesCount = 0;

  for (const acc of accounts) {
    if (isScryptHash(acc.passwordHash)) scryptHashCount++;
    aggregateXp += acc.progress?.xp ?? acc.user?.xp ?? 0;
    completedLessonsCount += (acc.progress?.completedLessonIds || []).length;
    completedExercisesCount += (acc.progress?.completedExerciseIds || []).length;
    completedQuizLessonsCount += (acc.progress?.completedQuizLessonIds || []).length;
    completedHomeworkLessonsCount += (acc.progress?.completedHomeworkLessonIds || []).length;
    legacyCompletedLessonsCount += (acc.progress?.legacyCompletedLessonIds || []).length;
    xpEventsCount += (acc.progress?.awardedXpEventIds || []).length;
    postXpDailyTotalsCount += Object.keys(acc.progress?.postXpDailyLog || {}).length;
    userFollowsCount += buildFollowRowsForAccount(acc, accounts).length;
    labExplorationCount += Object.keys(acc.labExploration || {}).length;
    capstoneProgressCount += Object.keys(acc.capstoneProgress || {}).length;
    labNotesCount += (acc.labNotes || []).length;
    if (acc.user?.learningProfile) learningProfilesCount++;
  }

  const posts = db.posts || [];
  let postVotesCount = 0;
  for (const p of posts) {
    postVotesCount += Object.keys(p.votesByUserId || {}).length;
  }

  const groups = db.groups || [];
  let groupMembersCount = 0;
  let groupInvitationsCount = 0;
  let groupJoinRequestsCount = 0;
  let groupMessagesCount = 0;
  for (const g of groups) {
    groupMembersCount += (g.members || []).length;
    groupInvitationsCount += (g.invitations || []).length;
    groupJoinRequestsCount += (g.joinRequests || []).length;
    groupMessagesCount += (g.messages || []).length;
  }

  return {
    schemaVersion: db.schemaVersion ?? 2,
    accountsCount: accounts.length,
    scryptHashCount,
    aggregateXp,
    completedLessonsCount,
    completedExercisesCount,
    completedQuizLessonsCount,
    completedHomeworkLessonsCount,
    legacyCompletedLessonsCount,
    xpEventsCount,
    postXpDailyTotalsCount,
    userFollowsCount,
    labExplorationCount,
    capstoneProgressCount,
    labNotesCount,
    postsCount: posts.length,
    postVotesCount,
    groupsCount: groups.length,
    groupMembersCount,
    groupInvitationsCount,
    groupJoinRequestsCount,
    groupMessagesCount,
    timelineEventsCount: (db.timelineEvents || []).length,
    revokedSessionsCount: (db.revokedSessions || []).length,
    learningProfilesCount,
  };
}

function resolveUserIdByHandle(
  accounts: DbSchema['accounts'],
  rawHandle: string | undefined
): string | null {
  if (!rawHandle || typeof rawHandle !== 'string') return null;
  const targetNorm = normalizeHandle(rawHandle);
  const found = accounts.find((a) => normalizeHandle(a.user.username) === targetNorm);
  return found ? found.user.id : null;
}

function buildFollowRowsForAccount(
  acc: DbSchema['accounts'][number],
  allAccounts: DbSchema['accounts']
): Array<typeof schema.userFollows.$inferInsert> {
  const rows: Array<typeof schema.userFollows.$inferInsert> = [];
  const seenHandles = new Set<string>();

  for (const rawTarget of acc.user.following || []) {
    if (typeof rawTarget !== 'string' || !rawTarget.trim()) continue;
    if (seenHandles.has(rawTarget)) continue;
    seenHandles.add(rawTarget);

    const targetNorm = normalizeHandle(rawTarget);
    const targetAcc = allAccounts.find((a) => normalizeHandle(a.user.username) === targetNorm);
    const myNorm = normalizeHandle(acc.user.username);
    const recordedInTargetFollowers = Boolean(
      targetAcc &&
        (targetAcc.user.followers || []).some((f) => normalizeHandle(f) === myNorm)
    );

    rows.push({
      followerUserId: acc.user.id,
      followedHandle: rawTarget,
      followedUserId: targetAcc ? targetAcc.user.id : null,
      recordedInFollowing: true,
      recordedInTargetFollowers,
    });
  }

  return rows;
}

export function buildDryRunPlan(db: DbSchema): MigrationPlanCounts {
  const m = computeSourceMetrics(db);
  return {
    users: m.accountsCount,
    user_progress: m.accountsCount,
    xp_events: m.xpEventsCount,
    post_xp_daily_totals: m.postXpDailyTotalsCount,
    user_follows: m.userFollowsCount,
    lab_exploration: m.labExplorationCount,
    capstone_progress: m.capstoneProgressCount,
    lab_notes: m.labNotesCount,
    posts: m.postsCount,
    post_votes: m.postVotesCount,
    groups: m.groupsCount,
    group_members: m.groupMembersCount,
    group_invitations: m.groupInvitationsCount,
    group_join_requests: m.groupJoinRequestsCount,
    group_messages: m.groupMessagesCount,
    timeline_events: m.timelineEventsCount,
    revoked_sessions: m.revokedSessionsCount,
    migration_history: 1,
  };
}

export async function runDrizzleMigrationsOnConfirmedDev(
  pool: Pool,
  db: NodePgDatabase<typeof schema>
): Promise<void> {
  const client = await pool.connect();
  try {
    await assertConfirmedDevNeonBranch(client);
  } finally {
    client.release();
  }

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  await migrate(db, { migrationsFolder });
}

export async function importJsonToPostgres(options: {
  pool: Pool;
  db: NodePgDatabase<typeof schema>;
  sourceDb: DbSchema;
  sourceSha256: string;
  dryRun?: boolean;
}): Promise<{
  dryRun: boolean;
  plannedCounts: MigrationPlanCounts;
  migrationKey: string;
}> {
  const { pool, db, sourceDb, sourceSha256, dryRun = false } = options;
  const plannedCounts = buildDryRunPlan(sourceDb);
  const migrationKey = `json-to-pg-v${sourceDb.schemaVersion ?? 2}-${sourceSha256.slice(0, 16)}`;

  const checkClient = await pool.connect();
  try {
    await assertConfirmedDevNeonBranch(checkClient);
  } finally {
    checkClient.release();
  }

  if (dryRun) {
    return { dryRun: true, plannedCounts, migrationKey };
  }

  const accounts = sourceDb.accounts || [];

  await db.transaction(async (tx) => {
    for (const acc of accounts) {
      await tx
        .insert(schema.users)
        .values({
          id: acc.user.id,
          email: acc.email,
          username: acc.user.username,
          passwordHash: acc.passwordHash,
          tokenVersion: acc.tokenVersion ?? 1,
          xp: acc.user.xp,
          streak: acc.user.streak,
          level: acc.user.level,
          rank: acc.user.rank,
          completion: acc.user.completion,
          verifiedTopics: [...(acc.user.verifiedTopics || [])],
          lastActiveDate: acc.user.lastActiveDate ?? null,
          lastStreakUpdate: acc.user.lastStreakUpdate ?? null,
          lastActiveTimestamp: acc.user.lastActiveTimestamp ?? null,
          learningProfile: acc.user.learningProfile ?? null,
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            email: acc.email,
            username: acc.user.username,
            passwordHash: acc.passwordHash,
            tokenVersion: acc.tokenVersion ?? 1,
            xp: acc.user.xp,
            streak: acc.user.streak,
            level: acc.user.level,
            rank: acc.user.rank,
            completion: acc.user.completion,
            verifiedTopics: [...(acc.user.verifiedTopics || [])],
            lastActiveDate: acc.user.lastActiveDate ?? null,
            lastStreakUpdate: acc.user.lastStreakUpdate ?? null,
            lastActiveTimestamp: acc.user.lastActiveTimestamp ?? null,
            learningProfile: acc.user.learningProfile ?? null,
            updatedAt: new Date(),
          },
        });

      const prog = acc.progress;
      await tx
        .insert(schema.userProgress)
        .values({
          userId: acc.user.id,
          schemaVersion: prog.schemaVersion ?? 2,
          completedLessonIds: [...(prog.completedLessonIds || [])],
          completedExerciseIds: [...(prog.completedExerciseIds || [])],
          completedQuizLessonIds: [...(prog.completedQuizLessonIds || [])],
          completedHomeworkLessonIds: [...(prog.completedHomeworkLessonIds || [])],
          legacyCompletedLessonIds: [...(prog.legacyCompletedLessonIds || [])],
          xp: prog.xp,
          streak: prog.streak,
          lastActiveDate: prog.lastActiveDate ?? null,
          lastStreakUpdate: prog.lastStreakUpdate ?? null,
          lastActiveTimestamp: prog.lastActiveTimestamp ?? null,
          lastSyncedAt: prog.lastSyncedAt ?? null,
          updatedAt: prog.updatedAt ?? null,
        })
        .onConflictDoUpdate({
          target: schema.userProgress.userId,
          set: {
            schemaVersion: prog.schemaVersion ?? 2,
            completedLessonIds: [...(prog.completedLessonIds || [])],
            completedExerciseIds: [...(prog.completedExerciseIds || [])],
            completedQuizLessonIds: [...(prog.completedQuizLessonIds || [])],
            completedHomeworkLessonIds: [...(prog.completedHomeworkLessonIds || [])],
            legacyCompletedLessonIds: [...(prog.legacyCompletedLessonIds || [])],
            xp: prog.xp,
            streak: prog.streak,
            lastActiveDate: prog.lastActiveDate ?? null,
            lastStreakUpdate: prog.lastStreakUpdate ?? null,
            lastActiveTimestamp: prog.lastActiveTimestamp ?? null,
            lastSyncedAt: prog.lastSyncedAt ?? null,
            updatedAt: prog.updatedAt ?? null,
          },
        });

      for (const eventId of prog.awardedXpEventIds || []) {
        await tx
          .insert(schema.xpEvents)
          .values({
            userId: acc.user.id,
            eventId,
          })
          .onConflictDoNothing({
            target: [schema.xpEvents.userId, schema.xpEvents.eventId],
          });
      }

      for (const [dateKey, xpAwarded] of Object.entries(prog.postXpDailyLog || {})) {
        await tx
          .insert(schema.postXpDailyTotals)
          .values({
            userId: acc.user.id,
            dateKey,
            xpAwarded,
          })
          .onConflictDoUpdate({
            target: [schema.postXpDailyTotals.userId, schema.postXpDailyTotals.dateKey],
            set: { xpAwarded },
          });
      }

      for (const [labId, exploration] of Object.entries(acc.labExploration || {})) {
        await tx
          .insert(schema.labExploration)
          .values({
            userId: acc.user.id,
            labId,
            exploredDiagramIds: [...(exploration.exploredDiagramIds || [])],
            executedTerminalCommands: [...(exploration.executedTerminalCommands || [])],
            logTargetVerified: Boolean(exploration.logTargetVerified),
            verifiedLogEntryId: exploration.verifiedLogEntryId ?? null,
            scenarioVerified: Boolean(exploration.scenarioVerified),
            verifiedHighlightLines: [...(exploration.verifiedHighlightLines || [])],
            explorationComplete: Boolean(exploration.explorationComplete),
          })
          .onConflictDoUpdate({
            target: [schema.labExploration.userId, schema.labExploration.labId],
            set: {
              exploredDiagramIds: [...(exploration.exploredDiagramIds || [])],
              executedTerminalCommands: [...(exploration.executedTerminalCommands || [])],
              logTargetVerified: Boolean(exploration.logTargetVerified),
              verifiedLogEntryId: exploration.verifiedLogEntryId ?? null,
              scenarioVerified: Boolean(exploration.scenarioVerified),
              verifiedHighlightLines: [...(exploration.verifiedHighlightLines || [])],
              explorationComplete: Boolean(exploration.explorationComplete),
              updatedAt: new Date(),
            },
          });
      }

      for (const [capstoneId, capProg] of Object.entries(acc.capstoneProgress || {})) {
        await tx
          .insert(schema.capstoneProgress)
          .values({
            userId: acc.user.id,
            capstoneId,
            currentStageId: capProg.currentStageId,
            stages: capProg.stages || {},
            reportSubmitted: Boolean(capProg.reportSubmitted),
            reportScore: capProg.reportScore ?? null,
            maxReportScore: capProg.maxReportScore ?? null,
            rubricBreakdown: capProg.rubricBreakdown ?? null,
            lastSubmissionSections: capProg.lastSubmissionSections ?? null,
            detailedSolutionExplanation: capProg.detailedSolutionExplanation ?? null,
            completedAt: capProg.completedAt ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.capstoneProgress.userId, schema.capstoneProgress.capstoneId],
            set: {
              currentStageId: capProg.currentStageId,
              stages: capProg.stages || {},
              reportSubmitted: Boolean(capProg.reportSubmitted),
              reportScore: capProg.reportScore ?? null,
              maxReportScore: capProg.maxReportScore ?? null,
              rubricBreakdown: capProg.rubricBreakdown ?? null,
              lastSubmissionSections: capProg.lastSubmissionSections ?? null,
              detailedSolutionExplanation: capProg.detailedSolutionExplanation ?? null,
              completedAt: capProg.completedAt ?? null,
              updatedAt: new Date(),
            },
          });
      }

      for (const note of acc.labNotes || []) {
        await tx
          .insert(schema.labNotes)
          .values({
            id: note.id,
            userId: acc.user.id,
            moduleId: note.moduleId,
            moduleTitle: note.moduleTitle,
            title: note.title,
            content: note.content,
            lastSaved: note.lastSaved,
          })
          .onConflictDoUpdate({
            target: schema.labNotes.id,
            set: {
              userId: acc.user.id,
              moduleId: note.moduleId,
              moduleTitle: note.moduleTitle,
              title: note.title,
              content: note.content,
              lastSaved: note.lastSaved,
            },
          });
      }
    }

    // Insert follow edges after all users exist so followedUserId FK resolves cleanly
    for (const acc of accounts) {
      const followRows = buildFollowRowsForAccount(acc, accounts);
      for (const row of followRows) {
        await tx
          .insert(schema.userFollows)
          .values(row)
          .onConflictDoUpdate({
            target: [schema.userFollows.followerUserId, schema.userFollows.followedHandle],
            set: {
              followedUserId: row.followedUserId,
              recordedInFollowing: row.recordedInFollowing,
              recordedInTargetFollowers: row.recordedInTargetFollowers,
            },
          });
      }
    }

    for (const post of sourceDb.posts || []) {
      await tx
        .insert(schema.posts)
        .values({
          id: post.id,
          title: post.title,
          author: post.author,
          authorRole: post.authorRole,
          content: post.content,
          category: post.category,
          upvotes: post.upvotes,
          userVote: post.userVote ?? null,
          createdAt: post.createdAt,
          commentsCount: post.commentsCount,
        })
        .onConflictDoUpdate({
          target: schema.posts.id,
          set: {
            title: post.title,
            author: post.author,
            authorRole: post.authorRole,
            content: post.content,
            category: post.category,
            upvotes: post.upvotes,
            userVote: post.userVote ?? null,
            createdAt: post.createdAt,
            commentsCount: post.commentsCount,
          },
        });

      for (const [voterId, vote] of Object.entries(post.votesByUserId || {})) {
        await tx
          .insert(schema.postVotes)
          .values({
            postId: post.id,
            userId: voterId,
            vote,
          })
          .onConflictDoUpdate({
            target: [schema.postVotes.postId, schema.postVotes.userId],
            set: { vote },
          });
      }
    }

    for (const grp of sourceDb.groups || []) {
      const resolvedOwnerId =
        grp.ownerId && accounts.some((a) => a.user.id === grp.ownerId)
          ? grp.ownerId
          : resolveUserIdByHandle(accounts, grp.ownerHandle);

      await tx
        .insert(schema.groups)
        .values({
          id: grp.id,
          name: grp.name,
          description: grp.description,
          avatar: grp.avatar,
          visibility: grp.visibility === 'public' ? 'public' : 'private',
          ownerId: resolvedOwnerId,
          ownerHandle: grp.ownerHandle,
          createdAt: grp.createdAt,
        })
        .onConflictDoUpdate({
          target: schema.groups.id,
          set: {
            name: grp.name,
            description: grp.description,
            avatar: grp.avatar,
            visibility: grp.visibility === 'public' ? 'public' : 'private',
            ownerId: resolvedOwnerId,
            ownerHandle: grp.ownerHandle,
            createdAt: grp.createdAt,
          },
        });

      for (const memberHandle of grp.members || []) {
        const memberUserId = resolveUserIdByHandle(accounts, memberHandle);
        await tx
          .insert(schema.groupMembers)
          .values({
            groupId: grp.id,
            memberHandle,
            userId: memberUserId,
          })
          .onConflictDoUpdate({
            target: [schema.groupMembers.groupId, schema.groupMembers.memberHandle],
            set: { userId: memberUserId },
          });
      }

      for (const inv of grp.invitations || []) {
        await tx
          .insert(schema.groupInvitations)
          .values({
            id: inv.id,
            groupId: grp.id,
            username: inv.username,
            invitedBy: inv.invitedBy,
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
          })
          .onConflictDoUpdate({
            target: schema.groupInvitations.id,
            set: {
              groupId: grp.id,
              username: inv.username,
              invitedBy: inv.invitedBy,
              createdAt: inv.createdAt,
              expiresAt: inv.expiresAt,
            },
          });
      }

      for (const req of grp.joinRequests || []) {
        await tx
          .insert(schema.groupJoinRequests)
          .values({
            id: req.id,
            groupId: grp.id,
            username: req.username,
            requestedAt: req.requestedAt,
          })
          .onConflictDoUpdate({
            target: schema.groupJoinRequests.id,
            set: {
              groupId: grp.id,
              username: req.username,
              requestedAt: req.requestedAt,
            },
          });
      }

      for (const msg of grp.messages || []) {
        const resolvedSenderId =
          msg.senderId && accounts.some((a) => a.user.id === msg.senderId)
            ? msg.senderId
            : resolveUserIdByHandle(accounts, msg.senderUsername);

        await tx
          .insert(schema.groupMessages)
          .values({
            id: msg.id,
            groupId: grp.id,
            senderId: resolvedSenderId,
            senderUsername: msg.senderUsername,
            senderRole: msg.senderRole,
            content: msg.content,
            createdAt: msg.createdAt,
          })
          .onConflictDoUpdate({
            target: schema.groupMessages.id,
            set: {
              groupId: grp.id,
              senderId: resolvedSenderId,
              senderUsername: msg.senderUsername,
              senderRole: msg.senderRole,
              content: msg.content,
              createdAt: msg.createdAt,
            },
          });
      }
    }

    for (const ev of sourceDb.timelineEvents || []) {
      await tx
        .insert(schema.timelineEvents)
        .values({
          id: ev.id,
          username: ev.username,
          action: ev.action,
          xpReward: ev.xpReward,
          timestamp: ev.timestamp,
        })
        .onConflictDoUpdate({
          target: schema.timelineEvents.id,
          set: {
            username: ev.username,
            action: ev.action,
            xpReward: ev.xpReward,
            timestamp: ev.timestamp,
          },
        });
    }

    for (const rev of sourceDb.revokedSessions || []) {
      await tx
        .insert(schema.revokedSessions)
        .values({
          sid: rev.sid,
          exp: rev.exp,
        })
        .onConflictDoUpdate({
          target: schema.revokedSessions.sid,
          set: { exp: rev.exp },
        });
    }

    await tx
      .insert(schema.migrationHistory)
      .values({
        migrationKey,
        sourceSha256,
        schemaVersion: sourceDb.schemaVersion ?? 2,
        summary: {
          plannedCounts,
          importedAt: new Date().toISOString(),
        },
      })
      .onConflictDoUpdate({
        target: schema.migrationHistory.migrationKey,
        set: {
          sourceSha256,
          schemaVersion: sourceDb.schemaVersion ?? 2,
          summary: {
            plannedCounts,
            importedAt: new Date().toISOString(),
          },
          appliedAt: new Date(),
        },
      });
  });

  return { dryRun: false, plannedCounts, migrationKey };
}

export interface ParityVerificationResult {
  ok: boolean;
  mismatches: string[];
  destinationCounts: MigrationPlanCounts;
  aggregateXp: number;
  completedLessonsCount: number;
  scryptHashesVerified: number;
}

export async function verifySourceToPostgresParity(
  db: NodePgDatabase<typeof schema>,
  sourceDb: DbSchema,
  expectedSourceSha256?: string
): Promise<ParityVerificationResult> {
  const mismatches: string[] = [];

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
    pgMigrationHistory,
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
    db.select().from(schema.migrationHistory),
  ]);

  const destinationCounts: MigrationPlanCounts = {
    users: pgUsers.length,
    user_progress: pgProgress.length,
    xp_events: pgXpEvents.length,
    post_xp_daily_totals: pgPostXpDaily.length,
    user_follows: pgFollows.length,
    lab_exploration: pgLabExploration.length,
    capstone_progress: pgCapstoneProgress.length,
    lab_notes: pgLabNotes.length,
    posts: pgPosts.length,
    post_votes: pgPostVotes.length,
    groups: pgGroups.length,
    group_members: pgGroupMembers.length,
    group_invitations: pgGroupInvitations.length,
    group_join_requests: pgGroupJoinRequests.length,
    group_messages: pgGroupMessages.length,
    timeline_events: pgTimelineEvents.length,
    revoked_sessions: pgRevokedSessions.length,
    migration_history: pgMigrationHistory.length,
  };

  const expected = buildDryRunPlan(sourceDb);
  for (const [table, expectedCount] of Object.entries(expected)) {
    if (table === 'migration_history') {
      if (pgMigrationHistory.length < 1) {
        mismatches.push('migration_history must contain at least 1 audit record');
      }
      if (expectedSourceSha256) {
        const expectedKey = `json-to-pg-v${sourceDb.schemaVersion ?? 2}-${expectedSourceSha256.slice(0, 16)}`;
        const matchingEntry = pgMigrationHistory.find(
          (m) => m.migrationKey === expectedKey && m.sourceSha256 === expectedSourceSha256
        );
        if (!matchingEntry) {
          mismatches.push(`Missing migration_history audit row for ${expectedKey}`);
        }
      }
      continue;
    }
    const actualCount = destinationCounts[table as keyof MigrationPlanCounts];
    if (actualCount !== expectedCount) {
      mismatches.push(`Row count mismatch in ${table}: expected ${expectedCount}, got ${actualCount}`);
    }
  }

  let aggregateXp = 0;
  let completedLessonsCount = 0;
  let scryptHashesVerified = 0;

  const usersById = new Map(pgUsers.map((u) => [u.id, u]));
  const progressByUserId = new Map(pgProgress.map((p) => [p.userId, p]));

  for (const acc of sourceDb.accounts || []) {
    const u = usersById.get(acc.user.id);
    const p = progressByUserId.get(acc.user.id);
    if (!u) {
      mismatches.push(`Missing user row for account ${acc.user.id}`);
      continue;
    }
    if (!p) {
      mismatches.push(`Missing user_progress row for account ${acc.user.id}`);
      continue;
    }

    if (!isScryptHash(u.passwordHash)) {
      mismatches.push(`Destination passwordHash for ${acc.user.id} is not a valid scrypt hash`);
    } else {
      scryptHashesVerified++;
    }

    const srcHashDigest = crypto.createHash('sha256').update(acc.passwordHash).digest('hex');
    const dstHashDigest = crypto.createHash('sha256').update(u.passwordHash).digest('hex');
    if (srcHashDigest !== dstHashDigest) {
      mismatches.push(`passwordHash digest mismatch for ${acc.user.id}`);
    }

    if (u.email !== acc.email || u.username !== acc.user.username) {
      mismatches.push(`Identity mismatch for ${acc.user.id}`);
    }
    if ((u.tokenVersion ?? 1) !== (acc.tokenVersion ?? 1)) {
      mismatches.push(`tokenVersion mismatch for ${acc.user.id}`);
    }
    if (u.xp !== acc.user.xp || p.xp !== acc.progress.xp) {
      mismatches.push(`XP mismatch for ${acc.user.id}`);
    }
    if (u.streak !== acc.user.streak || p.streak !== acc.progress.streak) {
      mismatches.push(`Streak mismatch for ${acc.user.id}`);
    }
    if (u.level !== acc.user.level || u.rank !== acc.user.rank || u.completion !== acc.user.completion) {
      mismatches.push(`Level/rank/completion mismatch for ${acc.user.id}`);
    }
    if (!isDeepStrictEqual(u.learningProfile ?? null, acc.user.learningProfile ?? null)) {
      mismatches.push(`learningProfile mismatch for ${acc.user.id}`);
    }
    if (!isDeepStrictEqual(p.completedLessonIds, acc.progress.completedLessonIds || [])) {
      mismatches.push(`completedLessonIds mismatch for ${acc.user.id}`);
    }
    if (!isDeepStrictEqual(p.completedExerciseIds, acc.progress.completedExerciseIds || [])) {
      mismatches.push(`completedExerciseIds mismatch for ${acc.user.id}`);
    }

    const userEvents = new Set(pgXpEvents.filter((e) => e.userId === acc.user.id).map((e) => e.eventId));
    for (const ev of acc.progress.awardedXpEventIds || []) {
      if (!userEvents.has(ev)) {
        mismatches.push(`Missing xp_event for ${acc.user.id}: ${ev}`);
      }
    }

    const userFollows = new Set(
      pgFollows.filter((f) => f.followerUserId === acc.user.id).map((f) => f.followedHandle)
    );
    for (const handle of acc.user.following || []) {
      if (!userFollows.has(handle)) {
        mismatches.push(`Missing follow edge for ${acc.user.id}`);
      }
    }

    aggregateXp += p.xp;
    completedLessonsCount += p.completedLessonIds.length;
  }

  const notesById = new Map(pgLabNotes.map((n) => [n.id, n]));
  for (const acc of sourceDb.accounts || []) {
    for (const note of acc.labNotes || []) {
      const dst = notesById.get(note.id);
      if (
        !dst ||
        dst.userId !== acc.user.id ||
        dst.moduleId !== note.moduleId ||
        dst.title !== note.title ||
        dst.content !== note.content ||
        dst.lastSaved !== note.lastSaved
      ) {
        mismatches.push(`Lab note mismatch for note ${note.id}`);
      }
    }
  }

  const postsById = new Map(pgPosts.map((p) => [p.id, p]));
  for (const post of sourceDb.posts || []) {
    const dst = postsById.get(post.id);
    if (
      !dst ||
      dst.title !== post.title ||
      dst.author !== post.author ||
      dst.content !== post.content ||
      dst.upvotes !== post.upvotes ||
      dst.category !== post.category ||
      dst.createdAt !== post.createdAt
    ) {
      mismatches.push(`Post mismatch for ${post.id}`);
    }
  }

  const groupsById = new Map(pgGroups.map((g) => [g.id, g]));
  for (const grp of sourceDb.groups || []) {
    const dst = groupsById.get(grp.id);
    if (
      !dst ||
      dst.name !== grp.name ||
      dst.description !== grp.description ||
      dst.visibility !== grp.visibility ||
      dst.ownerHandle !== grp.ownerHandle
    ) {
      mismatches.push(`Group mismatch for ${grp.id}`);
    }
    const membersSet = new Set(
      pgGroupMembers.filter((m) => m.groupId === grp.id).map((m) => m.memberHandle)
    );
    for (const m of grp.members || []) {
      if (!membersSet.has(m)) {
        mismatches.push(`Missing member in group ${grp.id}`);
      }
    }
    const msgIds = new Set(pgGroupMessages.filter((m) => m.groupId === grp.id).map((m) => m.id));
    for (const msg of grp.messages || []) {
      const dstMsg = pgGroupMessages.find((m) => m.id === msg.id);
      if (!msgIds.has(msg.id) || !dstMsg || dstMsg.content !== msg.content) {
        mismatches.push(`Group message mismatch for ${msg.id} in ${grp.id}`);
      }
    }
  }

  const timelineById = new Map(pgTimelineEvents.map((t) => [t.id, t]));
  for (const ev of sourceDb.timelineEvents || []) {
    const dst = timelineById.get(ev.id);
    if (
      !dst ||
      dst.username !== ev.username ||
      dst.action !== ev.action ||
      dst.xpReward !== ev.xpReward ||
      dst.timestamp !== ev.timestamp
    ) {
      mismatches.push(`Timeline event mismatch for ${ev.id}`);
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    destinationCounts,
    aggregateXp,
    completedLessonsCount,
    scryptHashesVerified,
  };
}

async function runCli(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const applyMigrations = !dryRun || args.has('--migrate');

  const pool = createNeonPool();
  const db = createDrizzleDb(pool);

  try {
    const { db: sourceDb, sha256, metrics } = loadValidatedSourceJson();
    if (applyMigrations && !dryRun) {
      await runDrizzleMigrationsOnConfirmedDev(pool, db);
    }

    const result = await importJsonToPostgres({
      pool,
      db,
      sourceDb,
      sourceSha256: sha256,
      dryRun,
    });

    let parity: ParityVerificationResult | null = null;
    if (!dryRun) {
      parity = await verifySourceToPostgresParity(db, sourceDb, sha256);
    }

    console.log(
      JSON.stringify(
        {
          ok: dryRun ? true : Boolean(parity?.ok),
          dryRun,
          sourceSha256: sha256,
          sourceMetrics: metrics,
          migrationKey: result.migrationKey,
          plannedCounts: result.plannedCounts,
          parity,
        },
        null,
        2
      )
    );

    if (parity && !parity.ok) {
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error(redactPgSecrets(String(err?.message || err)));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const isMainEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('migrateJsonToPostgres');

if (isMainEntry) {
  runCli();
}
