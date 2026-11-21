import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { CapstoneAccountProgress, LearningProfile } from '../types';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    tokenVersion: integer('token_version').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    level: integer('level').notNull().default(1),
    rank: text('rank').notNull().default('Cadet'),
    completion: integer('completion').notNull().default(0),
    verifiedTopics: jsonb('verified_topics').$type<string[]>().notNull().default([]),
    lastActiveDate: text('last_active_date'),
    lastStreakUpdate: text('last_streak_update'),
    lastActiveTimestamp: text('last_active_timestamp'),
    learningProfile: jsonb('learning_profile').$type<LearningProfile | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_username_unique').on(table.username),
  ]
);

export const userProgress = pgTable('user_progress', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  schemaVersion: integer('schema_version').notNull().default(2),
  completedLessonIds: jsonb('completed_lesson_ids').$type<string[]>().notNull().default([]),
  completedExerciseIds: jsonb('completed_exercise_ids').$type<string[]>().notNull().default([]),
  completedQuizLessonIds: jsonb('completed_quiz_lesson_ids').$type<string[]>().notNull().default([]),
  completedHomeworkLessonIds: jsonb('completed_homework_lesson_ids').$type<string[]>().notNull().default([]),
  legacyCompletedLessonIds: jsonb('legacy_completed_lesson_ids').$type<string[]>().notNull().default([]),
  xp: integer('xp').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  lastStreakUpdate: text('last_streak_update'),
  lastActiveTimestamp: text('last_active_timestamp'),
  lastSyncedAt: text('last_synced_at'),
  updatedAt: text('updated_at'),
});

export const xpEvents = pgTable(
  'xp_events',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: text('event_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.eventId] })]
);

export const postXpDailyTotals = pgTable(
  'post_xp_daily_totals',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateKey: text('date_key').notNull(),
    xpAwarded: integer('xp_awarded').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dateKey] })]
);

export const userFollows = pgTable(
  'user_follows',
  {
    followerUserId: text('follower_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followedHandle: text('followed_handle').notNull(),
    followedUserId: text('followed_user_id').references(() => users.id, { onDelete: 'set null' }),
    recordedInFollowing: boolean('recorded_in_following').notNull().default(true),
    recordedInTargetFollowers: boolean('recorded_in_target_followers').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerUserId, table.followedHandle] })]
);

export const labExploration = pgTable(
  'lab_exploration',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    labId: text('lab_id').notNull(),
    exploredDiagramIds: jsonb('explored_diagram_ids').$type<string[]>().notNull().default([]),
    executedTerminalCommands: jsonb('executed_terminal_commands').$type<string[]>().notNull().default([]),
    logTargetVerified: boolean('log_target_verified').notNull().default(false),
    verifiedLogEntryId: text('verified_log_entry_id'),
    scenarioVerified: boolean('scenario_verified').notNull().default(false),
    verifiedHighlightLines: jsonb('verified_highlight_lines').$type<number[]>().notNull().default([]),
    explorationComplete: boolean('exploration_complete').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.labId] })]
);

export const capstoneProgress = pgTable(
  'capstone_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    capstoneId: text('capstone_id').notNull(),
    currentStageId: text('current_stage_id').notNull(),
    stages: jsonb('stages').$type<CapstoneAccountProgress['stages']>().notNull().default({}),
    reportSubmitted: boolean('report_submitted').notNull().default(false),
    reportScore: integer('report_score'),
    maxReportScore: integer('max_report_score'),
    rubricBreakdown: jsonb('rubric_breakdown').$type<CapstoneAccountProgress['rubricBreakdown'] | null>(),
    lastSubmissionSections: jsonb('last_submission_sections').$type<Record<string, string> | null>(),
    detailedSolutionExplanation: text('detailed_solution_explanation'),
    completedAt: text('completed_at'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.capstoneId] })]
);

export const labNotes = pgTable(
  'lab_notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    moduleId: text('module_id').notNull(),
    moduleTitle: text('module_title').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    lastSaved: text('last_saved').notNull(),
  },
  (table) => [
    index('lab_notes_user_id_idx').on(table.userId),
    index('lab_notes_user_saved_idx').on(table.userId, table.lastSaved),
  ]
);

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    authorRole: text('author_role').notNull(),
    content: text('content').notNull(),
    category: text('category').notNull(),
    upvotes: integer('upvotes').notNull().default(0),
    userVote: text('user_vote'),
    createdAt: text('created_at').notNull(),
    commentsCount: integer('comments_count').notNull().default(0),
  },
  (table) => [index('posts_created_at_idx').on(table.createdAt)]
);

export const postVotes = pgTable(
  'post_votes',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vote: text('vote').notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })]
);

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  avatar: text('avatar').notNull(),
  visibility: text('visibility').notNull().default('private'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  ownerHandle: text('owner_handle').notNull(),
  createdAt: text('created_at').notNull(),
});

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    memberHandle: text('member_handle').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.memberHandle] })]
);

export const groupInvitations = pgTable(
  'group_invitations',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    invitedBy: text('invited_by').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [uniqueIndex('group_invitations_group_user_unique').on(table.groupId, table.username)]
);

export const groupJoinRequests = pgTable(
  'group_join_requests',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    requestedAt: text('requested_at').notNull(),
  },
  (table) => [uniqueIndex('group_join_requests_group_user_unique').on(table.groupId, table.username)]
);

export const groupMessages = pgTable(
  'group_messages',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').references(() => users.id, { onDelete: 'set null' }),
    senderUsername: text('sender_username').notNull(),
    senderRole: text('sender_role').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('group_messages_group_created_idx').on(table.groupId, table.createdAt)]
);

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    action: text('action').notNull(),
    xpReward: integer('xp_reward').notNull().default(0),
    timestamp: text('timestamp').notNull(),
  },
  (table) => [index('timeline_events_timestamp_idx').on(table.timestamp)]
);

export const revokedSessions = pgTable(
  'revoked_sessions',
  {
    sid: text('sid').primaryKey(),
    exp: bigint('exp', { mode: 'number' }).notNull(),
  },
  (table) => [index('revoked_sessions_exp_idx').on(table.exp)]
);

export const migrationHistory = pgTable('migration_history', {
  id: serial('id').primaryKey(),
  migrationKey: text('migration_key').notNull().unique(),
  sourceSha256: text('source_sha256').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  summary: jsonb('summary').$type<Record<string, unknown>>().notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});

export const recoverySnapshots = pgTable(
  'recovery_snapshots',
  {
    id: serial('id').primaryKey(),
    snapshotKey: text('snapshot_key').notNull().unique(),
    sourceProjectId: text('source_project_id').notNull(),
    sourceBranchId: text('source_branch_id').notNull(),
    algorithm: text('algorithm').notNull().default('aes-256-gcm'),
    kdf: text('kdf').notNull().default('hkdf-sha256'),
    salt: text('salt').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    ciphertext: text('ciphertext').notNull(),
    plaintextSha256: text('plaintext_sha256').notNull(),
    accountCount: integer('account_count').notNull(),
    aggregateXp: integer('aggregate_xp').notNull(),
    completedLessonsCount: integer('completed_lessons_count').notNull(),
    summary: jsonb('summary').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('recovery_snapshots_created_at_idx').on(table.createdAt)]
);
