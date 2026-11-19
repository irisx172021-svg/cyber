import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import {
  ALL_PRACTICAL_LABS,
  getPracticalLabById,
  getPracticalLabForLesson,
} from '../src/data/practicalLabs';
import {
  EXPLICIT_LESSON_DOMAIN_MAP,
  LEGACY_LESSON_ID_MAP,
  resolveCanonicalLessonId,
} from '../src/data/curriculumMetadata';
import { enhanceCurriculum, getExplicitDomainKey } from '../src/data/curriculumEnhancer';
import {
  computeCurriculumStats,
  getMissingPrerequisites,
  getNextRecommendedLesson,
  indexCurriculumLessons,
  isLessonUnlocked,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import {
  migrateDatabaseSchema,
  needsSchemaMigration,
} from '../src/server/migration';
import { getLessonContext } from '../src/server/groqTutor';
import { Lesson, Tier, UserProgress } from '../src/types';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

async function runTests() {
  const results: Array<{ name: string; status: 'PASS' | 'INFO'; detail: string }> = [];
  const record = (name: string, detail: string, status: 'PASS' | 'INFO' = 'PASS') => {
    results.push({ name, status, detail });
    console.log(`[${status}] ${name}: ${detail}`);
  };

  // 1. Curriculum Integrity & Graph DAG Validation
  const report = validateCurriculumGraph(ACADEMY_CURRICULUM, ALL_PRACTICAL_LABS);
  assert.equal(report.tierCount, 11, 'Expected 11 tiers');
  assert.equal(report.topicCount, 25, 'Expected 25 topics');
  assert.equal(report.lessonCount, 69, 'Expected 69 lessons');
  assert.deepEqual(report.duplicateTierIds, []);
  assert.deepEqual(report.duplicateTopicIds, []);
  assert.deepEqual(report.duplicateLessonIds, []);
  assert.deepEqual(report.malformedLessonIds, []);
  assert.deepEqual(report.missingPrerequisites, []);
  assert.deepEqual(report.missingRecommendedPrerequisites, []);
  assert.deepEqual(report.cycles, []);
  assert.deepEqual(report.lessonsWithoutQuiz, []);
  assert.deepEqual(report.lessonsWithoutMetadata, []);
  assert.deepEqual(report.missingLabsForLessons, []);
  assert.deepEqual(report.orphanLabs, []);
  assert.equal(report.valid, true);
  record(
    'Curriculum Integrity & DAG',
    `11 tiers, 25 topics, 69 lessons, ${ALL_PRACTICAL_LABS.length} labs, 0 duplicates, 0 malformed IDs, 0 missing prereqs, 0 cycles`
  );

  // Verify synthetic cycle detection works (negative test)
  const cyclicCurriculum: Tier[] = [
    {
      id: 't-cycle',
      number: 1,
      title: 'Cycle Test',
      description: 'Cycle Test',
      topics: [
        {
          id: 'top-cycle',
          title: 'Cycle Topic',
          category: 'foundations',
          lessons: [
            {
              id: 'l-a',
              title: 'A',
              description: 'A',
              duration: '5 mins',
              content: 'A',
              order: 1,
              tierId: 't-cycle',
              topicId: 'top-cycle',
              difficulty: 'beginner',
              estimatedMinutes: 5,
              prerequisites: ['l-b'],
              completionRequirements: { requireQuiz: true },
              quiz: [{ id: 'q1', question: 'Q', options: ['a', 'b'], correctOption: 0, explanation: 'E' }],
            },
            {
              id: 'l-b',
              title: 'B',
              description: 'B',
              duration: '5 mins',
              content: 'B',
              order: 2,
              tierId: 't-cycle',
              topicId: 'top-cycle',
              difficulty: 'beginner',
              estimatedMinutes: 5,
              prerequisites: ['l-a'],
              completionRequirements: { requireQuiz: true },
              quiz: [{ id: 'q2', question: 'Q', options: ['a', 'b'], correctOption: 0, explanation: 'E' }],
            },
          ],
        },
      ],
    },
  ];
  const cyclicReport = validateCurriculumGraph(cyclicCurriculum);
  assert.equal(cyclicReport.valid, false);
  assert.ok(cyclicReport.cycles.length > 0, 'Cycle detector must flag l-a <-> l-b cycle');
  record('Cycle Prevention Detector', `Detected synthetic cycle: ${cyclicReport.cycles[0].join(' -> ')}`);

  // 2. Domain Routing Tests (Explicit Map + No Unknown Fallback)
  const expectedDomainPairs: Array<[string, string, string]> = [
    ['comp-hardware', 'hardware', 'Von Neumann'],
    ['boot-os', 'boot', 'UEFI'],
    ['net-osi-tcp', 'networking', '7-Layer OSI Model'],
    ['ip-subnetting', 'networking', '7-Layer OSI Model'],
    ['infra-protocols', 'protocols', 'DORA handshake'],
    ['transport-protocols', 'protocols', 'DORA handshake'],
    ['vpn-firewalls', 'perimeter_security', 'Firewalls'],
    ['network-defense', 'perimeter_security', 'Firewalls'],
    ['git-workflows', 'dev_workflows', 'Git'],
    ['markup-formats', 'dev_workflows', 'YAML'],
    ['win-arch', 'windows', 'Active Directory'],
    ['static-analysis', 'malware_assembly', 'Static Analysis'],
    ['dynamic-analysis', 'malware_assembly', 'Dynamic Analysis'],
    ['osint-passive', 'offensive', 'Offensive security'],
    ['net-infiltration', 'offensive', 'Offensive security'],
    ['aws-iam-s3', 'cloud', 'Shared Responsibility Model'],
    ['aws-logging', 'cloud', 'Shared Responsibility Model'],
    ['azure-security', 'cloud', 'Shared Responsibility Model'],
    ['gcp-security', 'cloud', 'Shared Responsibility Model'],
    ['sym-asym-enc', 'cryptography', 'Symmetric Encryption'],
  ];

  const lessonIdx = indexCurriculumLessons(ACADEMY_CURRICULUM);
  for (const [lessonId, expectedKey, expectedSnippet] of expectedDomainPairs) {
    assert.equal(getExplicitDomainKey(lessonId), expectedKey, `Domain mismatch for ${lessonId}`);
    const entry = lessonIdx.get(lessonId);
    assert.ok(entry, `Lesson ${lessonId} missing from curriculum`);
    assert.ok(
      entry!.lesson.content.includes(expectedSnippet),
      `Enhanced content for ${lessonId} missing expected domain snippet "${expectedSnippet}"`
    );
  }
  assert.equal(
    getExplicitDomainKey('totally-unknown-lesson-id'),
    null,
    'Unknown lesson ID must return null domain key'
  );
  const unknownTestTier: Tier[] = [
    {
      id: 'tier-unk',
      number: 99,
      title: 'Unknown Test',
      description: 'Test',
      topics: [
        {
          id: 'topic-unk',
          title: 'Unknown Topic',
          category: 'grc',
          lessons: [
            {
              id: 'nonexistent-synthetic-lesson',
              title: 'Synthetic',
              description: 'Synthetic',
              duration: '10 mins',
              content: 'Original untouched content only.',
              quiz: [],
            },
          ],
        },
      ],
    },
  ];
  const enhancedUnknown = enhanceCurriculum(unknownTestTier);
  assert.equal(
    enhancedUnknown[0].topics[0].lessons[0].content,
    'Original untouched content only.',
    'Unknown lesson ID must not receive arbitrary fallback guide'
  );
  record(
    'Explicit Domain Routing & Unknown Fallback Safety',
    `Verified ${expectedDomainPairs.length} representative domain routes + confirmed unknown ID receives no fallback guide`
  );

  // 3. Guided Learning Rules
  const freshProgress: UserProgress = {
    completedLessonIds: [],
    completedExerciseIds: [],
    completedQuizLessonIds: [],
    completedHomeworkLessonIds: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
  };
  const compHw = lessonIdx.get('comp-hardware')!.lesson;
  const bootOs = lessonIdx.get('boot-os')!.lesson;
  const pyBasics = lessonIdx.get('py-basics')!.lesson;

  assert.equal(isLessonUnlocked(compHw, freshProgress, ACADEMY_CURRICULUM), true, 'First lesson unlocked');
  assert.equal(isLessonUnlocked(bootOs, freshProgress, ACADEMY_CURRICULUM), false, 'Dependent lesson locked');
  const bootMissing = getMissingPrerequisites(bootOs, freshProgress, ACADEMY_CURRICULUM);
  assert.deepEqual(
    bootMissing.map((m) => m.id),
    ['comp-hardware'],
    'Missing prerequisite explained accurately'
  );

  // Optional recommendedPrerequisites must NOT block when mandatory prereqs are met
  const afterMarkupProgress: UserProgress = {
    ...freshProgress,
    completedLessonIds: ['markup-formats'], // py-basics mandates markup-formats, recommends bash-scripting
  };
  assert.equal(
    isLessonUnlocked(pyBasics, afterMarkupProgress, ACADEMY_CURRICULUM),
    true,
    'Recommended prerequisites must not block'
  );

  // Already-completed legacy lesson remains accessible even without prerequisite completed
  const legacyProgress: UserProgress = {
    ...freshProgress,
    completedLessonIds: ['azure-security'],
  };
  assert.equal(
    isLessonUnlocked(lessonIdx.get('azure-security')!.lesson, legacyProgress, ACADEMY_CURRICULUM),
    true,
    'Already-completed lesson stays unlocked after reorganization'
  );
  assert.equal(
    getNextRecommendedLesson(ACADEMY_CURRICULUM, freshProgress)?.lesson.id,
    'comp-hardware',
    'New user starts at first unlocked lesson comp-hardware'
  );
  record(
    'Guided Learning & Prerequisite Rules',
    'Verified root unlock, mandatory lock/explanation, non-blocking recommendations, and completed-lesson preservation'
  );

  // 4. Progress Migration Tests on Copy of database.json + Synthetic Edge Cases
  const testCopyPath = path.join(process.cwd(), 'backups', 'pre-phase1', 'database.test-copy.json');
  const rawCopy = JSON.parse(fs.readFileSync(testCopyPath, 'utf-8'));
  assert.equal(needsSchemaMigration(rawCopy), true);

  const migratedCopy = migrateDatabaseSchema(rawCopy, ACADEMY_CURRICULUM);
  assert.equal(migratedCopy.changed, true);
  assert.equal(migratedCopy.db.accounts.length, rawCopy.accounts.length);
  assert.equal(migratedCopy.db.posts.length, rawCopy.posts.length);
  assert.equal(migratedCopy.db.timelineEvents.length, rawCopy.timelineEvents.length);
  assert.equal(migratedCopy.db.groups.length, rawCopy.groups.length);

  for (let i = 0; i < rawCopy.accounts.length; i++) {
    const before = rawCopy.accounts[i];
    const after = migratedCopy.db.accounts[i];
    assert.equal(after.user.xp, before.user.xp, `XP preserved for ${before.user.id}`);
    assert.equal(after.user.streak, before.user.streak, `Streak preserved for ${before.user.id}`);
    assert.equal(after.labNotes.length, before.labNotes.length, `Notes count preserved for ${before.user.id}`);
    for (let j = 0; j < before.labNotes.length; j++) {
      assert.equal(after.labNotes[j].content, before.labNotes[j].content, 'Note content preserved verbatim');
    }
  }

  // Verify usr-001 specific mapping
  const usr1After = migratedCopy.db.accounts.find((a) => a.user.id === 'usr-001')!;
  assert.deepEqual(usr1After.progress.completedLessonIds, ['net-osi-tcp']);
  assert.equal(usr1After.labNotes[0].moduleId, 'net-osi-tcp');
  assert.equal(usr1After.labNotes[1].moduleId, 'lin-permissions');

  // Verify usr-003 preserved azure-security + mapped 3 legacy IDs without auto-completing unearned lessons
  const usr3After = migratedCopy.db.accounts.find((a) => a.user.id === 'usr-003')!;
  assert.deepEqual(usr3After.progress.completedLessonIds, [
    'net-osi-tcp',
    'lin-permissions',
    'azure-security',
    'sym-asym-enc',
  ]);
  assert.equal(usr3After.user.xp, 3400);

  // Idempotency check on second migration pass
  assert.equal(needsSchemaMigration(migratedCopy.db), false);
  const secondPass = migrateDatabaseSchema(migratedCopy.db, ACADEMY_CURRICULUM);
  assert.equal(secondPass.changed, false);

  // Synthetic edge-case copy with 'net- OSI-tcp', duplicate IDs, 'lab-net- OSI-tcp', and unknown historical ID
  const edgeFixture = JSON.parse(JSON.stringify(rawCopy));
  edgeFixture.accounts[0].user.verifiedTopics = ['net- OSI-tcp', 'net-osi-tcp', 'retired-v0-module'];
  edgeFixture.accounts[0].progress = {
    completedLessonIds: ['net- OSI-tcp', 'net-osi-tcp', 'retired-v0-module'],
    completedExerciseIds: ['lab-net- OSI-tcp', 'lab-net-osi-tcp'],
    xp: 1250,
    streak: 5,
    lastActiveDate: '2026-07-15',
  };
  const edgeMigrated = migrateDatabaseSchema(edgeFixture, ACADEMY_CURRICULUM);
  assert.deepEqual(edgeMigrated.db.accounts[0].progress.completedLessonIds, ['net-osi-tcp']);
  assert.deepEqual(edgeMigrated.db.accounts[0].progress.completedExerciseIds, ['lab-net-osi-tcp']);
  assert.deepEqual(edgeMigrated.db.accounts[0].progress.legacyCompletedLessonIds, ['retired-v0-module']);
  assert.equal(edgeMigrated.db.accounts[0].user.xp, 1250);
  record(
    'Progress Migration & Rollback Safety',
    `Migrated ${rawCopy.accounts.length} accounts from copy with 0 XP loss, explicit ID mapping, unknown legacy preservation, and 2nd-pass idempotency`
  );

  // 5. Practical Labs & Canonical ID Resolution Regression
  assert.equal(resolveCanonicalLessonId('net- OSI-tcp'), 'net-osi-tcp');
  assert.equal(resolveCanonicalLessonId('osi-layered-model'), 'net-osi-tcp');
  assert.equal(resolveCanonicalLessonId('linux-cli'), 'lin-permissions');
  assert.equal(resolveCanonicalLessonId('cryptography-fundamentals'), 'sym-asym-enc');
  for (const lesson of lessonIdx.values()) {
    const lab = getPracticalLabForLesson(lesson.lesson.id);
    assert.ok(lab, `Missing practical lab for ${lesson.lesson.id}`);
    assert.equal(getPracticalLabById(lab!.id)?.id, lab!.id);
  }
  assert.ok(getLessonContext('net- OSI-tcp')?.lesson.id === 'net-osi-tcp');
  assert.ok(getLessonContext('net-osi-tcp')?.lesson.id === 'net-osi-tcp');
  record(
    'Practical Lab & Tutor Context Regression',
    `All ${lessonIdx.size} lessons resolve practical labs cleanly + legacy ID lookup verified for net-osi-tcp`
  );

  // 6. Live Express API Integration Tests (against temporary isolated copy of database.json)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-phase1-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(testCopyPath, tmpDbPath);

  const { createApiApp } = await import('../server');
  const app = createApiApp(tmpDbPath, {
    sessionSecret: 'test-phase1-secret-key-material-32bytes',
  });

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const client = new TestCookieClient(baseUrl);
    const anonClient = new TestCookieClient(baseUrl);

    // Register a synthetic test user cleanly on the isolated copy
    const reg = await client.request('POST', '/api/auth/register', {
      email: 'phase1-runner@test.local',
      username: 'Phase1Runner',
      password: 'ValidTestPasscode!2026',
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.data.token, undefined, 'Session token must never be exposed in JSON body');
    assert.ok(client.cookies.has('cfa_session'), 'HttpOnly session cookie must be set on registration');

    // Prepare valid answers dynamically from curriculum/labs
    const compHwAnswers = Object.fromEntries(
      compHw.quiz.map((q) => [q.id, q.correctOption])
    );
    const compHwLab = getPracticalLabForLesson('comp-hardware')!;

    // 6a. XP idempotency on new quiz completion
    const quiz1 = await client.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers: compHwAnswers,
    });
    assert.equal(quiz1.status, 200);
    assert.equal(quiz1.data.user.xp, compHw.quiz.length * 100);
    assert.ok(quiz1.data.progress.completedLessonIds.includes('comp-hardware'));

    const quiz2 = await client.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers: compHwAnswers,
    });
    assert.equal(quiz2.status, 200);
    assert.equal(quiz2.data.user.xp, compHw.quiz.length * 100, 'Duplicate quiz submission must not add XP');

    // 6b. XP idempotency on practical lab completion
    const lab1 = await client.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compHwLab.id,
      selectedOption: compHwLab.challenge.correctIndex,
    });
    assert.equal(lab1.status, 200);
    const expectedAfterLab = compHw.quiz.length * 100 + compHwLab.xpReward;
    assert.equal(lab1.data.user.xp, expectedAfterLab);

    const lab2 = await client.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compHwLab.id,
      selectedOption: compHwLab.challenge.correctIndex,
    });
    assert.equal(lab2.data.user.xp, expectedAfterLab, 'Duplicate practical lab completion must not add XP');

    // 6c. verify_homework on unlocked boot-os without passing quiz does NOT prematurely mark lesson complete
    const validBootDfOutput =
      'Filesystem     Type      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2 ext4      100G   32G   68G  32% /';
    const hw1 = await client.request('POST', '/api/user/engage', {
      engagementType: 'verify_homework',
      lessonId: 'boot-os',
      terminalOutput: validBootDfOutput,
    });
    assert.equal(hw1.status, 200);
    assert.equal(hw1.data.user.xp, expectedAfterLab + 200);
    assert.ok(hw1.data.progress.completedHomeworkLessonIds.includes('boot-os'));
    assert.equal(
      hw1.data.progress.completedLessonIds.includes('boot-os'),
      false,
      'verify_homework alone must not mark quiz-required lesson as completed'
    );
    const hw2 = await client.request('POST', '/api/user/engage', {
      engagementType: 'verify_homework',
      lessonId: 'boot-os',
      terminalOutput: validBootDfOutput,
    });
    assert.equal(hw2.data.user.xp, expectedAfterLab + 200, 'Duplicate homework verification must not add XP');

    // 6d. Forged /api/user/sync overwrite rejected (403)
    const staleSync = await client.request('POST', '/api/user/sync', {
      user: { xp: 99999, verifiedTopics: [] },
      progress: {
        xp: 99999,
        completedLessonIds: [],
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
    });
    assert.equal(staleSync.status, 403);

    // Legitimate empty sync returns authoritative state
    const validSync = await client.request('POST', '/api/user/sync', {});
    assert.equal(validSync.status, 200);
    assert.equal(validSync.data.user.xp, expectedAfterLab + 200);

    // 6e. POST /api/posts awards +50 XP server-side
    const postRes = await client.request('POST', '/api/posts', {
      title: 'Phase 1 Test',
      content: 'Testing server XP',
      category: 'General',
    });
    assert.equal(postRes.status, 201);
    assert.equal(postRes.data.user.xp, expectedAfterLab + 250);

    // 6f. Groq AI Tutor status & request handling regression
    const tutorStatus = await anonClient.request('GET', '/api/ai/tutor/status');
    assert.equal(tutorStatus.status, 200);
    assert.equal(tutorStatus.data.provider, 'groq');
    assert.equal(tutorStatus.data.model, process.env.GROQ_MODEL || 'openai/gpt-oss-120b');

    const tutorUnauth = await anonClient.request('POST', '/api/ai/tutor', {
      lessonId: 'net-osi-tcp',
      action: 'explain_simply',
    });
    assert.equal(tutorUnauth.status, 401, 'Unauthenticated AI tutor request must fail closed with 401');

    const tutorCall = await client.request('POST', '/api/ai/tutor', {
      lessonId: 'net-osi-tcp',
      action: 'explain_simply',
    });
    if (tutorStatus.data.configured) {
      assert.equal(tutorCall.status, 200);
      assert.ok(typeof tutorCall.data.reply === 'string' && tutorCall.data.reply.length > 20);
      record('Groq AI Tutor Live Regression', `Verified 401 unauth guard + status 200 with model ${tutorCall.data.model}`);
    } else {
      assert.equal(tutorCall.status, 503);
      record(
        'Groq AI Tutor Regression (Key Unset)',
        'Verified 401 unauth guard, /api/ai/tutor/status (openai/gpt-oss-120b), and 503 guard when GROQ_API_KEY is unset',
        'INFO'
      );
    }

    record(
      'Express API Integration (Isolated DB Copy)',
      'Verified HttpOnly cookie auth, XP idempotency (quiz/lab/homework), homework completion accuracy, forged /api/user/sync rejection, and server-side post XP'
    );
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\nALL PHASE 1 VERIFICATION CHECKS COMPLETED (${results.length} suites).`);
}

runTests().catch((err) => {
  console.error('Phase 1 verification failed:', err);
  process.exit(1);
});
