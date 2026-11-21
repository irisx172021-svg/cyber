import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_COMMUNITY_POSTS,
  DEFAULT_LAB_NOTES,
  DEFAULT_TIMELINE_EVENTS,
} from '../src/data/initialState';
import { CURRENT_PROGRESS_SCHEMA_VERSION } from '../src/data/curriculumMetadata';
import { createDefaultLearningProfile } from '../src/lib/learningProfile';
import { hashPasswordSync, isScryptHash } from '../src/server/auth';
import { AccountRecord, DbSchema } from '../src/server/migration';
import { SEED_OPERATOR_DIRECTORY } from '../src/server/seedData';
import type { PracticalLab, Tier } from '../src/types';

// Cache deterministic scrypt hashes once per test process for fast execution across tests
let cachedPass123Hash: string | null = null;
let cachedDefaultPassHash: string | null = null;
let cachedCustomPassHash: string | null = null;

function getSeedPass123Hash(): string {
  if (!cachedPass123Hash) cachedPass123Hash = hashPasswordSync('password123');
  return cachedPass123Hash;
}

function getSeedDefaultPassHash(): string {
  if (!cachedDefaultPassHash) cachedDefaultPassHash = hashPasswordSync('cybersecurity');
  return cachedDefaultPassHash;
}

function getCustomFixtureHash(): string {
  if (!cachedCustomPassHash) cachedCustomPassHash = hashPasswordSync('FixtureLearner!2026');
  return cachedCustomPassHash;
}

export function snapshotFileSha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function assertLiveDbUnchanged(preRunSha256: string, rootDir = process.cwd()): {
  liveSha256: string;
  accountsCount: number;
} {
  const livePath = path.join(rootDir, 'database.json');
  assert.ok(fs.existsSync(livePath), 'Live database.json must exist');
  const postSha256 = snapshotFileSha256(livePath);
  assert.equal(
    postSha256,
    preRunSha256,
    'Live database.json must remain byte-for-byte unchanged during verification tests'
  );
  const liveDb = JSON.parse(fs.readFileSync(livePath, 'utf-8')) as DbSchema;
  assert.ok(liveDb.accounts.length >= 5, 'Live database.json must preserve >= 5 accounts');
  for (const acc of liveDb.accounts) {
    assert.equal(
      isScryptHash(acc.passwordHash),
      true,
      `Live account ${acc.user.username} must keep a valid salted scrypt hash`
    );
  }
  return {
    liveSha256: postSha256,
    accountsCount: liveDb.accounts.length,
  };
}

export function createBaselineTestDbFixture(): DbSchema {
  const primaryHash = getSeedPass123Hash();
  const otherHash = getSeedDefaultPassHash();
  const customHash = getCustomFixtureHash();
  const nowIso = '2026-11-20T06:04:00.000Z';

  const baseAccounts: AccountRecord[] = SEED_OPERATOR_DIRECTORY.map((dirUser) => {
    const isPrimary = dirUser.id === 'usr-001';
    const completed = [...(dirUser.verifiedTopics || [])];
    return {
      email: dirUser.email,
      passwordHash: isPrimary ? primaryHash : otherHash,
      tokenVersion: 1,
      user: {
        ...dirUser,
        username: dirUser.username.startsWith('@') ? dirUser.username : `@${dirUser.username}`,
        verifiedTopics: completed,
        following: [...(dirUser.following || [])],
        followers: [...(dirUser.followers || [])],
        learningProfile: createDefaultLearningProfile(),
      },
      progress: {
        schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
        completedLessonIds: completed,
        completedExerciseIds: [],
        completedQuizLessonIds: completed,
        completedHomeworkLessonIds: [],
        legacyCompletedLessonIds: [],
        awardedXpEventIds: completed.map((id) => `submit_quiz:${id}`),
        xp: dirUser.xp,
        streak: dirUser.streak,
        lastActiveDate: dirUser.lastActiveDate,
        lastSyncedAt: nowIso,
        updatedAt: nowIso,
      },
      labNotes: isPrimary ? JSON.parse(JSON.stringify(DEFAULT_LAB_NOTES)) : [],
    };
  });

  // 6th account matching dev baseline total (6 accounts, 7,950 XP, 9 completed lessons)
  baseAccounts.push({
    email: 'dev-custom@test.local',
    passwordHash: customHash,
    tokenVersion: 1,
    user: {
      id: 'usr-q5i3h0dmd',
      username: '@DevCustomLearner',
      email: 'dev-custom@test.local',
      streak: 0,
      lastActiveDate: null,
      xp: 0,
      rank: 'Cadet',
      level: 1,
      completion: 0,
      verifiedTopics: [],
      following: [],
      followers: [],
      learningProfile: {
        interests: ['pathway-soc-detection', 'pathway-cloud-sec'],
        experienceLevel: 'experienced',
        goals: 'Focus on SOC detection and cloud security labs',
        onboardingCompleted: true,
        updatedAt: nowIso,
      },
    },
    progress: {
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
      lastSyncedAt: nowIso,
      updatedAt: nowIso,
    },
    labNotes: [],
  });

  return {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    accounts: baseAccounts,
    posts: JSON.parse(JSON.stringify(DEFAULT_COMMUNITY_POSTS)),
    timelineEvents: JSON.parse(JSON.stringify(DEFAULT_TIMELINE_EVENTS)),
    revokedSessions: [],
    groups: [
      {
        id: 'grp-general',
        name: 'General Operators',
        description: 'Core discussion channel for all academy cadets and system operator elites.',
        avatar: '🛡️',
        visibility: 'public',
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@Infiltrator_X', '@AuditMaster'],
        invitations: [],
        joinRequests: [],
        messages: [
          {
            id: 'msg-1',
            senderId: 'usr-001',
            senderUsername: '@NetRunner_Zero',
            senderRole: 'System Operator',
            content:
              'Welcome to the CyberFoundations Academy internal feed! Ensure you complete your local terminal verification homework.',
            createdAt: '2026-11-19T10:00:00.000Z',
          },
          {
            id: 'msg-2',
            senderId: 'usr-002',
            senderUsername: '@Infiltrator_X',
            senderRole: 'Infiltrator',
            content: 'Acknowledged. Running local nmap scans on the target range now.',
            createdAt: '2026-11-19T12:00:00.000Z',
          },
        ],
        createdAt: '2026-11-19T09:00:00.000Z',
      },
      {
        id: 'grp-threat-hunting',
        name: 'Threat Hunting & Forensics',
        description: 'Advanced log analysis, RAM analysis, and malware dissection.',
        avatar: '🔍',
        visibility: 'private',
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@AuditMaster'],
        invitations: [],
        joinRequests: [],
        messages: [
          {
            id: 'msg-3',
            senderId: 'usr-003',
            senderUsername: '@AuditMaster',
            senderRole: 'Auditor',
            content: 'Found some suspicious event logs on Domain Controller 01. Looks like pass-the-hash.',
            createdAt: '2026-11-19T14:00:00.000Z',
          },
        ],
        createdAt: '2026-11-19T09:05:00.000Z',
      },
    ],
  };
}

export function writeBaselineFixtureCopy(targetPath: string): DbSchema {
  const db = createBaselineTestDbFixture();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(db, null, 2), 'utf-8');
  return db;
}

/**
 * Simulates a legacy schema-v1 database snapshot prior to Phase 1 migration:
 * - Legacy lesson & labNote IDs ('osi-layered-model', 'linux-cli', 'net- OSI-tcp', 'cryptography-fundamentals')
 * - Legacy accounts without `progress` object or `schemaVersion: 2`
 * - Legacy groups without explicit visibility/invitations/joinRequests
 */
export function createLegacyV1PrePhase1Fixture(): any {
  const fixture = createBaselineTestDbFixture();
  const legacy: any = JSON.parse(JSON.stringify(fixture));
  delete legacy.schemaVersion;

  for (const acc of legacy.accounts) {
    delete acc.progress;
    delete acc.user.learningProfile;
  }

  const usr1 = legacy.accounts.find((a: any) => a.user.id === 'usr-001');
  usr1.user.verifiedTopics = ['osi-layered-model'];
  usr1.labNotes[0].moduleId = 'osi-layered-model';
  usr1.labNotes[1].moduleId = 'linux-cli';

  const usr3 = legacy.accounts.find((a: any) => a.user.id === 'usr-003');
  usr3.user.verifiedTopics = [
    'net- OSI-tcp',
    'linux-cli',
    'azure-security',
    'cryptography-fundamentals',
  ];
  usr3.user.xp = 3400;

  for (const grp of legacy.groups) {
    delete grp.visibility;
    delete grp.invitations;
    delete grp.joinRequests;
  }

  return legacy;
}

/**
 * Simulates a pre-Phase 1.9B database snapshot:
 * - Valid v2 accounts, 2 groups lacking `visibility`, `invitations`, `joinRequests`
 * - 2 historical messages in group 0 and 1 message in group 1
 */
export function createLegacyPre19bGroupFixture(): any {
  const fixture = createBaselineTestDbFixture();
  const legacy: any = JSON.parse(JSON.stringify(fixture));
  for (const grp of legacy.groups) {
    delete grp.visibility;
    delete grp.invitations;
    delete grp.joinRequests;
  }
  return legacy;
}

/**
 * Verifies that all 69 pre-Phase-2.3 lessons, 69 labs, and 276 quiz questions remain preserved
 * alongside the 7 Phase 2.3 expansion modules (76 total lessons, 76 labs, 304 questions).
 */
export function assertPre23BaselinePreserved(
  curriculum: Tier[],
  labs: PracticalLab[],
  newModuleIds: readonly string[]
): { preLessonCount: number; preQuizCount: number; preLabCount: number } {
  const newSet = new Set<string>(newModuleIds);
  const allLessons = curriculum.flatMap((t) => t.topics.flatMap((tp) => tp.lessons));
  const preLessons = allLessons.filter((l) => !newSet.has(l.id));
  const labByLessonId = new Map(labs.map((l) => [l.lessonId, l]));

  assert.equal(allLessons.length, 76, 'Expected 76 canonical lessons total');
  assert.equal(preLessons.length, 69, 'Expected all 69 pre-Phase 2.3 lessons preserved');

  let preQuizCount = 0;
  let preLabCount = 0;
  for (const lesson of preLessons) {
    assert.notEqual(
      lesson.completionRequirements?.requirePracticalLab,
      true,
      `Legacy lesson ${lesson.id} must keep requirePracticalLab false/unset`
    );
    assert.equal(lesson.completionRequirements?.minQuizScorePercent ?? 100, 100);
    assert.equal(lesson.quiz.length, 4, `Legacy lesson ${lesson.id} must retain 4 quiz questions`);
    for (const q of lesson.quiz) {
      assert.equal(q.options.length, 4, `Quiz ${q.id} must retain 4 options`);
      assert.ok(
        Number.isInteger(q.correctOption) && q.correctOption >= 0 && q.correctOption < 4,
        `Quiz ${q.id} invalid correctOption`
      );
      preQuizCount++;
    }
    assert.ok(labByLessonId.has(lesson.id), `Missing canonical lab for legacy lesson ${lesson.id}`);
    preLabCount++;
  }

  assert.equal(preQuizCount, 276, 'Expected all 276 pre-Phase 2.3 quiz questions preserved');
  assert.equal(preLabCount, 69, 'Expected all 69 pre-Phase 2.3 practical labs preserved');
  return { preLessonCount: preLessons.length, preQuizCount, preLabCount };
}
