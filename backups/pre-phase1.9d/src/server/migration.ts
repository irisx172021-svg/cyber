import fs from 'fs';
import path from 'path';
import {
  CommunityPost,
  Group,
  LabNote,
  QuizQuestionFeedback,
  Tier,
  TimelineEvent,
  User,
  UserProgress,
} from '../types';
import {
  CURRENT_PROGRESS_SCHEMA_VERSION,
  LEGACY_EXERCISE_ID_MAP,
  LEGACY_LESSON_ID_MAP,
  resolveCanonicalLessonId,
} from '../data/curriculumMetadata';
import {
  computeCurriculumStats,
  filterValidCompletedLessonIds,
  getMissingPrerequisites,
  indexCurriculumLessons,
  isLessonRequirementsMet,
  isLessonUnlocked,
  normalizeCompletedExerciseIds,
  PrerequisiteInfo,
} from '../lib/curriculumProgress';
import {
  getCanonicalLabForLesson,
  gradeLabChallengeSubmission,
  gradeQuizSubmission,
  validateServerHomeworkOutput,
} from './assessments';
import {
  hashPasswordSync,
  isRedactedCredentialMarker,
  isScryptHash,
  pruneRevokedSessions,
  RevokedSessionRecord,
} from './auth';

export const QUIZ_XP_PER_QUESTION = 100;
export const HOMEWORK_XP_REWARD = 200;
export const POST_XP_REWARD = 50;
export const MAX_DAILY_POST_XP = 100;
export const MAX_AUTO_MIGRATION_BACKUPS = 5;

export interface AccountRecord {
  email: string;
  passwordHash: string;
  tokenVersion?: number;
  user: User;
  progress: UserProgress;
  labNotes: LabNote[];
}

export interface DbSchema {
  schemaVersion?: number;
  accounts: AccountRecord[];
  posts: CommunityPost[];
  timelineEvents: TimelineEvent[];
  groups: Group[];
  revokedSessions?: RevokedSessionRecord[];
}

export interface AccountMigrationDetail {
  userId: string;
  username: string;
  xpBefore: number;
  xpAfter: number;
  mappedLessonIds: Array<{ from: string; to: string }>;
  unknownLegacyIdsPreserved: string[];
  mappedNoteModuleIds: Array<{ noteId: string; from: string; to: string }>;
}

export interface MigrationResult {
  db: DbSchema;
  changed: boolean;
  accountDetails: AccountMigrationDetail[];
}

export function computeUserLevelAndRank(xp: number, currentRank?: string): { level: number; rank: string } {
  const safeXp = Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0;
  const level = Math.floor(safeXp / 500) + 1;
  let rank = currentRank || 'Cadet';
  if (safeXp >= 1500 && safeXp < 2000) {
    rank = 'Elite Operator';
  } else if (safeXp >= 2000) {
    rank = 'Senior Cyber Infiltrator';
  }
  return { level, rank };
}

export function needsSchemaMigration(rawDb: any): boolean {
  if (!rawDb || typeof rawDb !== 'object') return false;
  if (rawDb.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION) return true;
  if (!Array.isArray(rawDb.accounts)) return false;

  for (const acc of rawDb.accounts) {
    if (!acc?.progress || acc.progress.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION) {
      return true;
    }
    const checkLists = [
      ...(acc.progress.completedLessonIds || []),
      ...(acc.progress.completedQuizLessonIds || []),
      ...(acc.progress.completedHomeworkLessonIds || []),
      ...(acc.user?.verifiedTopics || []),
    ];
    if (checkLists.some((id: string) => Boolean(LEGACY_LESSON_ID_MAP[id]))) {
      return true;
    }
    if ((acc.progress.completedExerciseIds || []).some((id: string) => Boolean(LEGACY_EXERCISE_ID_MAP[id]))) {
      return true;
    }
    if ((acc.labNotes || []).some((n: LabNote) => Boolean(LEGACY_LESSON_ID_MAP[n.moduleId]))) {
      return true;
    }
  }

  if (Array.isArray(rawDb.groups)) {
    for (const grp of rawDb.groups) {
      if (
        !grp ||
        (grp.visibility !== 'public' && grp.visibility !== 'private') ||
        !Array.isArray(grp.invitations) ||
        !Array.isArray(grp.joinRequests)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Pure, idempotent schema v1 -> v2 migration function.
 * - Preserves XP, streaks, notes, accounts, posts, timelineEvents, groups, tokenVersion
 * - Maps legacy/inconsistent lesson & lab IDs strictly via explicit maps (never by title matching)
 * - Preserves unrecognized historical IDs in `legacyCompletedLessonIds`
 * - Never auto-completes new/unearned lessons
 * - Populates `awardedXpEventIds` so historical completions cannot earn duplicate XP
 */
export function migrateDatabaseSchema(rawDb: any, curriculum: Tier[]): MigrationResult {
  const cloned: DbSchema = JSON.parse(JSON.stringify(rawDb));
  let changed = cloned.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION;
  cloned.schemaVersion = CURRENT_PROGRESS_SCHEMA_VERSION;

  if (Array.isArray(cloned.revokedSessions)) {
    const pruned = pruneRevokedSessions(cloned.revokedSessions);
    if (pruned.length !== cloned.revokedSessions.length) {
      cloned.revokedSessions = pruned;
      changed = true;
    }
  }

  const accountDetails: AccountMigrationDetail[] = [];

  if (!Array.isArray(cloned.accounts)) {
    cloned.accounts = [];
    changed = true;
  }

  for (const acc of cloned.accounts) {
    if (!acc.user.followers) {
      acc.user.followers = [];
      changed = true;
    }
    if (!acc.user.following) {
      acc.user.following = [];
      changed = true;
    }
    if (typeof acc.tokenVersion !== 'number') {
      acc.tokenVersion = 1;
    }

    const xpBefore = typeof acc.user.xp === 'number' ? acc.user.xp : (acc.progress?.xp ?? 0);
    const rawCompleted = acc.progress?.completedLessonIds ?? acc.user.verifiedTopics ?? [];
    const rawQuizzes = acc.progress?.completedQuizLessonIds ?? [];
    const rawHomework = acc.progress?.completedHomeworkLessonIds ?? [];
    const rawExercises = acc.progress?.completedExerciseIds ?? [];

    const mappedLessonIds: Array<{ from: string; to: string }> = [];
    for (const rawId of rawCompleted) {
      const mapped = LEGACY_LESSON_ID_MAP[rawId];
      if (mapped) {
        mappedLessonIds.push({ from: rawId, to: mapped });
      }
    }

    const { validIds: validCompleted, unknownLegacyIds: unknownCompleted } =
      filterValidCompletedLessonIds(rawCompleted, curriculum);
    const { validIds: validQuizzes, unknownLegacyIds: unknownQuizzes } =
      filterValidCompletedLessonIds(rawQuizzes, curriculum);
    const { validIds: validHomework, unknownLegacyIds: unknownHomework } =
      filterValidCompletedLessonIds(rawHomework, curriculum);
    const validExercises = normalizeCompletedExerciseIds(rawExercises);

    const existingLegacySet = new Set<string>(acc.progress?.legacyCompletedLessonIds || []);
    for (const unk of [...unknownCompleted, ...unknownQuizzes, ...unknownHomework]) {
      existingLegacySet.add(unk);
    }
    const legacyCompletedLessonIds = Array.from(existingLegacySet);

    const awardedEventSet = new Set<string>(acc.progress?.awardedXpEventIds || []);
    for (const qId of validQuizzes) {
      awardedEventSet.add(`submit_quiz:${qId}`);
    }
    for (const hwId of validHomework) {
      awardedEventSet.add(`verify_homework:${hwId}`);
    }
    for (const exId of validExercises) {
      awardedEventSet.add(`complete_exercise:${exId}`);
    }
    for (const cId of validCompleted) {
      if (!validQuizzes.includes(cId) && !validHomework.includes(cId)) {
        awardedEventSet.add(`legacy_completed:${cId}`);
      }
    }

    const prevCompletedStr = JSON.stringify(acc.progress?.completedLessonIds || []);
    const nextCompletedStr = JSON.stringify(validCompleted);
    if (
      prevCompletedStr !== nextCompletedStr ||
      acc.progress?.schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION
    ) {
      changed = true;
    }

    const mappedNoteModuleIds: Array<{ noteId: string; from: string; to: string }> = [];
    if (!Array.isArray(acc.labNotes)) {
      acc.labNotes = [];
      changed = true;
    } else {
      acc.labNotes = acc.labNotes.map((note) => {
        const mapped = LEGACY_LESSON_ID_MAP[note.moduleId];
        if (mapped && mapped !== note.moduleId) {
          mappedNoteModuleIds.push({ noteId: note.id, from: note.moduleId, to: mapped });
          changed = true;
          return { ...note, moduleId: mapped };
        }
        return note;
      });
    }

    const preservedXp = xpBefore;
    const preservedStreak =
      typeof acc.user.streak === 'number' ? acc.user.streak : (acc.progress?.streak ?? 0);
    const preservedLastActive = acc.user.lastActiveDate ?? acc.progress?.lastActiveDate ?? null;
    const preservedLastStreakUpdate =
      acc.user.lastStreakUpdate ?? acc.progress?.lastStreakUpdate ?? null;
    const preservedLastActiveTs =
      acc.user.lastActiveTimestamp ?? acc.progress?.lastActiveTimestamp ?? null;

    const updatedProgress: UserProgress = {
      schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
      completedLessonIds: validCompleted,
      completedExerciseIds: validExercises,
      completedQuizLessonIds: validQuizzes,
      completedHomeworkLessonIds: validHomework,
      legacyCompletedLessonIds,
      awardedXpEventIds: Array.from(awardedEventSet),
      ...(acc.progress?.postXpDailyLog
        ? { postXpDailyLog: { ...acc.progress.postXpDailyLog } }
        : {}),
      xp: preservedXp,
      streak: preservedStreak,
      lastActiveDate: preservedLastActive,
      lastStreakUpdate: preservedLastStreakUpdate,
      lastActiveTimestamp: preservedLastActiveTs,
      lastSyncedAt: acc.progress?.lastSyncedAt || new Date().toISOString(),
      updatedAt: acc.progress?.updatedAt || new Date().toISOString(),
    };

    const stats = computeCurriculumStats(curriculum, updatedProgress);
    const { level, rank } = computeUserLevelAndRank(preservedXp, acc.user.rank);

    acc.user.xp = preservedXp;
    acc.user.streak = preservedStreak;
    acc.user.level = level;
    acc.user.rank = rank;
    acc.user.completion = stats.completionPercent;
    acc.user.verifiedTopics = validCompleted;
    acc.progress = updatedProgress;

    accountDetails.push({
      userId: acc.user.id,
      username: acc.user.username,
      xpBefore,
      xpAfter: acc.user.xp,
      mappedLessonIds,
      unknownLegacyIdsPreserved: legacyCompletedLessonIds,
      mappedNoteModuleIds,
    });
  }

  if (!Array.isArray(cloned.groups)) {
    cloned.groups = [];
    changed = true;
  } else {
    for (const grp of cloned.groups) {
      if (!grp || typeof grp !== 'object') continue;

      // Preserve existing owner without inventing one: only resolve missing handle/id from matching existing account
      if (!grp.ownerHandle && grp.ownerId) {
        const ownerAcc = cloned.accounts.find((a) => a.user.id === grp.ownerId);
        if (ownerAcc) {
          grp.ownerHandle = ownerAcc.user.username;
          changed = true;
        }
      } else if (!grp.ownerId && grp.ownerHandle) {
        const cleanOwner = grp.ownerHandle.trim().replace(/^@+/, '').toLowerCase();
        const ownerAcc = cloned.accounts.find(
          (a) => a.user.username.trim().replace(/^@+/, '').toLowerCase() === cleanOwner
        );
        if (ownerAcc) {
          grp.ownerId = ownerAcc.user.id;
          changed = true;
        }
      }

      // Conservative default for legacy groups lacking explicit visibility
      if (grp.visibility !== 'public' && grp.visibility !== 'private') {
        grp.visibility = 'private';
        changed = true;
      }

      if (!Array.isArray(grp.members)) {
        grp.members = [];
        changed = true;
      }
      if (!Array.isArray(grp.messages)) {
        grp.messages = [];
        changed = true;
      }
      if (!Array.isArray(grp.invitations)) {
        grp.invitations = [];
        changed = true;
      }
      if (!Array.isArray(grp.joinRequests)) {
        grp.joinRequests = [];
        changed = true;
      }
    }
  }

  return {
    db: cloned,
    changed,
    accountDetails,
  };
}

/**
 * Idempotently migrates any remaining plaintext account passwords to salted scrypt hashes.
 * Preserves accounts that have already been upgraded and never hashes redacted placeholders.
 */
export function migrateAccountPasswordsToScrypt(rawDb: DbSchema): {
  db: DbSchema;
  upgradedCount: number;
  alreadyHashedCount: number;
  skippedCount: number;
  upgradedUserIds: string[];
} {
  const cloned: DbSchema = JSON.parse(JSON.stringify(rawDb));
  let upgradedCount = 0;
  let alreadyHashedCount = 0;
  let skippedCount = 0;
  const upgradedUserIds: string[] = [];

  for (const acc of cloned.accounts || []) {
    if (isScryptHash(acc.passwordHash)) {
      alreadyHashedCount++;
      continue;
    }
    if (!acc.passwordHash || isRedactedCredentialMarker(acc.passwordHash)) {
      skippedCount++;
      continue;
    }
    acc.passwordHash = hashPasswordSync(acc.passwordHash);
    upgradedCount++;
    upgradedUserIds.push(acc.user.id);
  }

  return {
    db: cloned,
    upgradedCount,
    alreadyHashedCount,
    skippedCount,
    upgradedUserIds,
  };
}

/**
 * Scrubs any unhashed plaintext passwords inside JSON backup payloads so recovery backups
 * never retain exposed plaintext credentials while preserving learner progress and notes.
 */
export function sanitizeDbCredentialsForBackup(
  rawDb: any,
  migratedHashByUserId?: Map<string, string>
): { db: any; redactedCount: number } {
  const cloned = JSON.parse(JSON.stringify(rawDb));
  let redactedCount = 0;

  if (Array.isArray(cloned?.accounts)) {
    for (const acc of cloned.accounts) {
      if (!acc || typeof acc.passwordHash !== 'string') continue;
      if (isScryptHash(acc.passwordHash) || isRedactedCredentialMarker(acc.passwordHash)) {
        continue;
      }
      const mappedHash = acc.user?.id ? migratedHashByUserId?.get(acc.user.id) : undefined;
      acc.passwordHash = mappedHash && isScryptHash(mappedHash)
        ? mappedHash
        : '[REDACTED_PLAINTEXT_REMOVED]';
      redactedCount++;
    }
  }

  return { db: cloned, redactedCount };
}

/**
 * Ensures a credential-safe backup exists before performing a live schema migration on database.json
 * and enforces bounded retention on auto-migration snapshots.
 */
export function ensureMigrationBackup(
  dbPath: string,
  backupDir?: string,
  maxRetained = MAX_AUTO_MIGRATION_BACKUPS
): string {
  const targetDir = backupDir || path.join(path.dirname(dbPath), 'backups', 'auto-migrations');
  fs.mkdirSync(targetDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(targetDir, `database.pre-v${CURRENT_PROGRESS_SCHEMA_VERSION}.${stamp}.json`);

  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const { db: sanitized } = sanitizeDbCredentialsForBackup(raw);
    fs.writeFileSync(backupPath, JSON.stringify(sanitized, null, 2), { encoding: 'utf-8', mode: 0o600 });
  } catch {
    fs.copyFileSync(dbPath, backupPath);
  }

  // Enforce retention policy for auto-migration snapshots
  if (maxRetained > 0) {
    const files = fs
      .readdirSync(targetDir)
      .filter((f) => f.startsWith('database.pre-v') && f.endsWith('.json'))
      .sort();
    while (files.length > maxRetained) {
      const oldest = files.shift()!;
      try {
        fs.unlinkSync(path.join(targetDir, oldest));
      } catch {
        // ignore cleanup failure
      }
    }
  }

  return backupPath;
}

export interface EngagementInput {
  engagementType: 'open_lesson' | 'submit_quiz' | 'verify_homework' | 'complete_exercise';
  lessonId?: string;
  exerciseId?: string;
  selectedOption?: number;
  answers?: Record<string, number>;
  terminalOutput?: string;
  xpEarned?: unknown;
  xp?: unknown;
  nowMs?: number;
}

export type EngagementMutationResult =
  | {
      ok: true;
      xpAwarded: number;
      newlyCompletedLesson: boolean;
      timelineAction?: string;
      scorePercent?: number;
      requiredPercent?: number;
      correctCount?: number;
      totalQuestions?: number;
      passed?: boolean;
      questionFeedback?: Record<string, QuizQuestionFeedback>;
      explanation?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      missingPrerequisites?: PrerequisiteInfo[];
      scorePercent?: number;
      requiredPercent?: number;
      correctCount?: number;
      totalQuestions?: number;
      passed?: boolean;
      questionFeedback?: Record<string, QuizQuestionFeedback>;
    };

/**
 * Server-authoritative active engagement mutation:
 * - Rejects any client-supplied xp or xpEarned values
 * - Verifies lesson existence & prerequisite unlock rules (already-completed lessons stay accessible; recommendedPrerequisites never block)
 * - Verifies quiz answers against minQuizScorePercent on the server (using server-only assessment keys)
 * - Verifies practical lab challenge option & lesson ownership on the server
 * - Verifies terminal homework requirement & pattern match on the server
 * - Enforces strict 24-hour streak cap + canonical one-time XP ledger (`awardedXpEventIds`)
 */
export function applyEngagementMutation(
  account: AccountRecord,
  input: EngagementInput,
  curriculum: Tier[]
): EngagementMutationResult {
  if (input.xpEarned !== undefined || input.xp !== undefined) {
    return {
      ok: false,
      status: 400,
      error: 'Client-submitted XP values are not permitted; XP is calculated exclusively by the server.',
    };
  }

  if (!input.lessonId || typeof input.lessonId !== 'string' || !input.lessonId.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'Valid lessonId is required.',
    };
  }

  const canonicalLessonId = resolveCanonicalLessonId(input.lessonId.trim());
  const lessonIndex = indexCurriculumLessons(curriculum);
  const indexedLesson = lessonIndex.get(canonicalLessonId);

  if (!indexedLesson) {
    return {
      ok: false,
      status: 404,
      error: `Lesson "${input.lessonId}" was not found in the academy curriculum.`,
    };
  }

  const lesson = indexedLesson.lesson;

  // Enforce mandatory prerequisite completion (completed lessons stay unlocked; recommendedPrerequisites never block)
  if (!isLessonUnlocked(lesson, account.progress, curriculum)) {
    const missing = getMissingPrerequisites(lesson, account.progress, curriculum);
    return {
      ok: false,
      status: 403,
      error: `Lesson "${lesson.title}" is locked until required prerequisites are completed.`,
      missingPrerequisites: missing,
    };
  }

  const practicalLab = getCanonicalLabForLesson(canonicalLessonId);

  const completedLessonIds = [...(account.progress?.completedLessonIds || [])];
  const completedExerciseIds = [...(account.progress?.completedExerciseIds || [])];
  const completedQuizLessonIds = [...(account.progress?.completedQuizLessonIds || [])];
  const completedHomeworkLessonIds = [...(account.progress?.completedHomeworkLessonIds || [])];
  const awardedXpEventIds = [...(account.progress?.awardedXpEventIds || [])];

  let nextXp = account.user.xp || 0;
  let xpAwarded = 0;
  let newlyCompletedLesson = false;
  let timelineAction: string | undefined;
  let verifiedQuizScorePercent: number | undefined;
  let extraFeedback: {
    scorePercent?: number;
    requiredPercent?: number;
    correctCount?: number;
    totalQuestions?: number;
    passed?: boolean;
    questionFeedback?: Record<string, QuizQuestionFeedback>;
    explanation?: string;
  } = {};

  if (input.engagementType === 'complete_exercise') {
    const labGrade = gradeLabChallengeSubmission(
      canonicalLessonId,
      input.exerciseId,
      input.selectedOption
    );

    if (labGrade.ok === false) {
      return {
        ok: false,
        status: labGrade.status,
        error: labGrade.error,
      };
    }

    if (!labGrade.correct) {
      return {
        ok: false,
        status: 400,
        error: 'Practical lab challenge answer is incorrect. Review the lab material and retry.',
      };
    }

    const lab = labGrade.lab;
    const eventKey = `complete_exercise:${lab.id}`;
    if (!completedExerciseIds.includes(lab.id)) {
      completedExerciseIds.push(lab.id);
    }
    if (!awardedXpEventIds.includes(eventKey)) {
      awardedXpEventIds.push(eventKey);
      const serverLabXp = typeof lab.xpReward === 'number' && lab.xpReward > 0 ? lab.xpReward : 75;
      nextXp += serverLabXp;
      xpAwarded += serverLabXp;
      timelineAction = `completed practical lab for ${lesson.title}`;
    }
    extraFeedback = {
      explanation: labGrade.explanation,
    };
  } else if (input.engagementType === 'submit_quiz') {
    const quizGrade = gradeQuizSubmission(lesson, input.answers);
    if (quizGrade.ok === false) {
      return {
        ok: false,
        status: quizGrade.status,
        error: quizGrade.error,
      };
    }

    verifiedQuizScorePercent = quizGrade.scorePercent;

    if (!quizGrade.passed) {
      return {
        ok: false,
        status: 400,
        error: `Quiz score ${quizGrade.scorePercent}% is below the required ${quizGrade.requiredPercent}% threshold.`,
        scorePercent: quizGrade.scorePercent,
        requiredPercent: quizGrade.requiredPercent,
        correctCount: quizGrade.correctCount,
        totalQuestions: quizGrade.totalQuestions,
        passed: false,
        questionFeedback: quizGrade.questionFeedback,
      };
    }

    const eventKey = `submit_quiz:${canonicalLessonId}`;
    const legacyKey = `legacy_completed:${canonicalLessonId}`;
    if (!completedQuizLessonIds.includes(canonicalLessonId)) {
      completedQuizLessonIds.push(canonicalLessonId);
    }
    if (!awardedXpEventIds.includes(eventKey) && !awardedXpEventIds.includes(legacyKey)) {
      awardedXpEventIds.push(eventKey);
      const serverQuizXp = lesson.quiz.length * QUIZ_XP_PER_QUESTION;
      nextXp += serverQuizXp;
      xpAwarded += serverQuizXp;
      timelineAction = `completed ${lesson.title}`;
    }

    extraFeedback = {
      scorePercent: quizGrade.scorePercent,
      requiredPercent: quizGrade.requiredPercent,
      correctCount: quizGrade.correctCount,
      totalQuestions: quizGrade.totalQuestions,
      passed: true,
      questionFeedback: quizGrade.questionFeedback,
    };
  } else if (input.engagementType === 'verify_homework') {
    if (!lesson.requiresTerminal) {
      return {
        ok: false,
        status: 400,
        error: `Lesson "${lesson.id}" does not include a terminal verification assignment.`,
      };
    }

    if (
      typeof input.terminalOutput !== 'string' ||
      !input.terminalOutput.trim() ||
      input.terminalOutput.length > 20000
    ) {
      return {
        ok: false,
        status: 400,
        error: 'Non-empty terminal command output is required for homework verification.',
      };
    }

    if (!validateServerHomeworkOutput(lesson, input.terminalOutput)) {
      return {
        ok: false,
        status: 400,
        error: lesson.homeworkHint
          ? `Terminal output did not match expected markers. Hint: ${lesson.homeworkHint}`
          : 'Terminal output did not match expected verification rules.',
      };
    }

    const eventKey = `verify_homework:${canonicalLessonId}`;
    if (!completedHomeworkLessonIds.includes(canonicalLessonId)) {
      completedHomeworkLessonIds.push(canonicalLessonId);
    }
    if (!awardedXpEventIds.includes(eventKey)) {
      awardedXpEventIds.push(eventKey);
      nextXp += HOMEWORK_XP_REWARD;
      xpAwarded += HOMEWORK_XP_REWARD;
      timelineAction = `verified local command output for ${lesson.title}`;
    }
  }

  // Update daily active streak strictly after validation succeeds (so invalid submissions never bump streak)
  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayStr = nowIso.split('T')[0];

  const prevStreak = account.user.streak || 0;
  const lastStreakUpdate = account.user.lastStreakUpdate || null;
  const lastActiveTimestamp = account.user.lastActiveTimestamp || null;
  const lastTime = lastActiveTimestamp ? new Date(lastActiveTimestamp).getTime() : 0;
  const hours24 = 24 * 60 * 60 * 1000;
  const isNextCalendarDay = lastStreakUpdate !== todayStr;
  const isAtLeast24Hours = nowMs - lastTime >= hours24;

  let finalStreak = prevStreak;
  let finalStreakUpdate = lastStreakUpdate;
  let finalActiveTimestamp = lastActiveTimestamp;

  if (isNextCalendarDay && isAtLeast24Hours) {
    finalStreak = prevStreak + 1;
    finalStreakUpdate = todayStr;
    finalActiveTimestamp = nowIso;
  }

  const nextProgressDraft: UserProgress = {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    completedLessonIds,
    completedExerciseIds,
    completedQuizLessonIds,
    completedHomeworkLessonIds,
    legacyCompletedLessonIds: account.progress?.legacyCompletedLessonIds || [],
    awardedXpEventIds,
    ...(account.progress?.postXpDailyLog
      ? { postXpDailyLog: { ...account.progress.postXpDailyLog } }
      : {}),
    xp: nextXp,
    streak: finalStreak,
    lastActiveDate: todayStr,
    lastStreakUpdate: finalStreakUpdate,
    lastActiveTimestamp: finalActiveTimestamp,
    lastSyncedAt: nowIso,
    updatedAt: nowIso,
  };

  if (
    input.engagementType !== 'open_lesson' &&
    !completedLessonIds.includes(canonicalLessonId)
  ) {
    if (
      isLessonRequirementsMet(
        lesson,
        nextProgressDraft,
        practicalLab?.id,
        verifiedQuizScorePercent
      )
    ) {
      completedLessonIds.push(canonicalLessonId);
      newlyCompletedLesson = true;
    }
  }

  const stats = computeCurriculumStats(curriculum, nextProgressDraft);
  const { level, rank } = computeUserLevelAndRank(nextXp, account.user.rank);

  account.user.xp = nextXp;
  account.user.streak = finalStreak;
  account.user.lastActiveDate = todayStr;
  account.user.lastStreakUpdate = finalStreakUpdate;
  account.user.lastActiveTimestamp = finalActiveTimestamp;
  account.user.verifiedTopics = completedLessonIds;
  account.user.level = level;
  account.user.rank = rank;
  account.user.completion = stats.completionPercent;
  account.progress = nextProgressDraft;

  return {
    ok: true,
    xpAwarded,
    newlyCompletedLesson,
    timelineAction,
    ...extraFeedback,
  };
}

/**
 * Server-authoritative post creation XP helper with per-UTC-day XP cap (MAX_DAILY_POST_XP)
 * and one-time event ledger (`post:${postId}`).
 * Must be invoked inside withDbLock to guarantee concurrency safety.
 */
export function applyPostCreationXp(
  account: AccountRecord,
  postId: string,
  postTitle: string,
  nowMs = Date.now()
): { xpAwarded: number; dailyCapReached: boolean; timelineEvent?: TimelineEvent } {
  const nowIso = new Date(nowMs).toISOString();
  const todayStr = nowIso.split('T')[0];

  if (!account.progress) {
    account.progress = {
      schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
      completedLessonIds: account.user.verifiedTopics || [],
      completedExerciseIds: [],
      completedQuizLessonIds: [],
      completedHomeworkLessonIds: [],
      legacyCompletedLessonIds: [],
      awardedXpEventIds: [],
      xp: account.user.xp || 0,
      streak: account.user.streak || 0,
      lastActiveDate: account.user.lastActiveDate || null,
      updatedAt: nowIso,
    };
  }

  const awardedEvents = account.progress.awardedXpEventIds || [];
  const dailyLog = { ...(account.progress.postXpDailyLog || {}) };

  // Prune post XP daily logs older than 30 days
  const cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  for (const key of Object.keys(dailyLog)) {
    const parsedTime = Date.parse(key);
    if (!Number.isFinite(parsedTime) || parsedTime < cutoffMs) {
      delete dailyLog[key];
    }
  }

  const postEventId = `post:${postId}`;
  const earnedToday = typeof dailyLog[todayStr] === 'number' ? dailyLog[todayStr] : 0;

  if (awardedEvents.includes(postEventId)) {
    account.progress.postXpDailyLog = dailyLog;
    return { xpAwarded: 0, dailyCapReached: earnedToday >= MAX_DAILY_POST_XP };
  }

  if (earnedToday + POST_XP_REWARD > MAX_DAILY_POST_XP) {
    account.progress.postXpDailyLog = dailyLog;
    return { xpAwarded: 0, dailyCapReached: true };
  }

  awardedEvents.push(postEventId);
  dailyLog[todayStr] = earnedToday + POST_XP_REWARD;

  const nextXp = (account.user.xp || 0) + POST_XP_REWARD;
  const { level, rank } = computeUserLevelAndRank(nextXp, account.user.rank);
  account.user.xp = nextXp;
  account.user.level = level;
  account.user.rank = rank;
  account.progress.awardedXpEventIds = awardedEvents;
  account.progress.postXpDailyLog = dailyLog;
  account.progress.xp = nextXp;
  account.progress.updatedAt = nowIso;

  return {
    xpAwarded: POST_XP_REWARD,
    dailyCapReached: dailyLog[todayStr] >= MAX_DAILY_POST_XP,
    timelineEvent: {
      id: `ev-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      username: account.user.username,
      action: `posted "${postTitle}"`,
      xpReward: POST_XP_REWARD,
      timestamp: nowIso,
    },
  };
}

/**
 * Strictly server-authoritative `/api/user/sync`:
 * Rejects any attempt by a client to mutate xp, xpEarned, streak, level, rank, or completion arrays.
 * Legitimate empty-body sync pings return authoritative server progress.
 */
export function applySafeProgressSync(
  account: AccountRecord,
  payload: { user?: Record<string, any>; progress?: Record<string, any>; xp?: unknown; xpEarned?: unknown },
  curriculum: Tier[]
): { ok: true; staleOverwritePrevented: false } | { ok: false; status: number; error: string } {
  const forbiddenProgressFields = [
    'xp',
    'xpEarned',
    'streak',
    'level',
    'rank',
    'completion',
    'completedLessonIds',
    'completedExerciseIds',
    'completedQuizLessonIds',
    'completedHomeworkLessonIds',
    'legacyCompletedLessonIds',
    'awardedXpEventIds',
    'verifiedTopics',
  ];

  const hasForbiddenTopLevel =
    payload && (payload.xp !== undefined || payload.xpEarned !== undefined);
  const hasForbiddenUserFields =
    payload?.user &&
    typeof payload.user === 'object' &&
    forbiddenProgressFields.some((k) => payload.user![k] !== undefined);
  const hasForbiddenProgressFields =
    payload?.progress &&
    typeof payload.progress === 'object' &&
    forbiddenProgressFields.some((k) => payload.progress![k] !== undefined);

  if (hasForbiddenTopLevel || hasForbiddenUserFields || hasForbiddenProgressFields) {
    return {
      ok: false,
      status: 403,
      error:
        'Client-submitted XP, streak, or completion values are rejected; progress is strictly server-authoritative.',
    };
  }

  const nowIso = new Date().toISOString();
  const serverProgress: UserProgress = account.progress || {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    completedLessonIds: account.user.verifiedTopics || [],
    completedExerciseIds: [],
    completedQuizLessonIds: [],
    completedHomeworkLessonIds: [],
    legacyCompletedLessonIds: [],
    awardedXpEventIds: [],
    xp: account.user.xp || 0,
    streak: account.user.streak || 0,
    lastActiveDate: account.user.lastActiveDate || null,
    lastStreakUpdate: account.user.lastStreakUpdate || null,
    lastActiveTimestamp: account.user.lastActiveTimestamp || null,
    updatedAt: nowIso,
  };

  serverProgress.lastSyncedAt = nowIso;
  account.progress = serverProgress;

  const stats = computeCurriculumStats(curriculum, serverProgress);
  const { level, rank } = computeUserLevelAndRank(account.user.xp || 0, account.user.rank);
  account.user.level = level;
  account.user.rank = rank;
  account.user.completion = stats.completionPercent;

  return { ok: true, staleOverwritePrevented: false };
}
