import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ACADEMY_CAPSTONES } from '../src/data/capstones';
import { ALL_PRACTICAL_LABS } from '../src/data/practicalLabs';
import { JOURNEY_STAGES, SPECIALIST_PATHWAYS } from '../src/data/journeyBlueprint';
import { indexCurriculumLessons, isLessonUnlocked } from '../src/lib/curriculumProgress';
import {
  CANONICAL_PATHWAY_IDS,
  createDefaultLearningProfile,
  getRelevantTopicsForPathway,
  LEARNING_EXPERIENCE_OPTIONS,
  MAX_GOALS_LENGTH,
  normalizeLearningProfile,
  PATHWAY_ONBOARDING_DETAILS,
} from '../src/lib/learningProfile';
import { computePersonalizedRecommendations } from '../src/lib/learningRecommendations';
import { migrateDatabaseSchema } from '../src/server/migration';
import { LearningProfile, UserProgress } from '../src/types';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase2_5c_test_session_secret_material_32chars';

async function startTempServer(dbPath: string) {
  const { createApiApp } = await import('../server');
  const app = createApiApp(dbPath, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      exploreUserMax: 300,
      exploreUserWindowMs: 60_000,
      exploreIpMax: 400,
      exploreIpWindowMs: 60_000,
      assessmentUserMax: 300,
      assessmentUserWindowMs: 60_000,
      assessmentIpMax: 400,
      assessmentIpWindowMs: 60_000,
    },
  });
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

function makeProgress(completedIds: string[], xp = 0): UserProgress {
  return {
    completedLessonIds: [...completedIds],
    completedExerciseIds: [],
    completedQuizLessonIds: [...completedIds],
    completedHomeworkLessonIds: [],
    xp,
    streak: 1,
    lastActiveDate: null,
  };
}

async function runTests() {
  const rootDir = process.cwd();
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const lessonIndex = indexCurriculumLessons(ACADEMY_CURRICULUM);

  // =========================================================================
  // 1 & 3. EXISTING ACCOUNT MIGRATION & IDEMPOTENCY (ZERO DATA LOSS)
  // =========================================================================
  const liveDbPath = path.join(rootDir, 'database.json');
  const preRunLiveBytes = fs.readFileSync(liveDbPath);
  const preRunLiveHash = crypto.createHash('sha256').update(preRunLiveBytes).digest('hex');
  const liveDbRaw = JSON.parse(preRunLiveBytes.toString('utf-8'));

  // Self-contained isolated pre-v2 fixture with two accounts (one customized profile, one lacking profile)
  const v1SampleRaw = {
    schemaVersion: 1,
    accounts: [
      {
        email: 'fixture-custom@test.local',
        passwordHash: liveDbRaw.accounts[0].passwordHash,
        tokenVersion: 1,
        user: {
          id: 'usr-fixture-custom',
          username: '@FixtureCustom',
          email: 'fixture-custom@test.local',
          xp: 1250,
          streak: 5,
          level: 3,
          rank: 'System Operator',
          completion: 1,
          verifiedTopics: ['net-osi-tcp'],
          following: [],
          followers: [],
          lastActiveDate: '2026-11-19',
        },
        progress: {
          schemaVersion: 1,
          completedLessonIds: ['net-osi-tcp'],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 1250,
          streak: 5,
          lastActiveDate: '2026-11-19',
        },
        labNotes: [],
      },
      {
        email: 'fixture-default@test.local',
        passwordHash: liveDbRaw.accounts[0].passwordHash,
        tokenVersion: 1,
        user: {
          id: 'usr-fixture-default',
          username: '@FixtureDefault',
          email: 'fixture-default@test.local',
          xp: 0,
          streak: 0,
          level: 1,
          rank: 'Cadet',
          completion: 0,
          verifiedTopics: [],
          following: [],
          followers: [],
          lastActiveDate: null,
        },
        progress: {
          schemaVersion: 1,
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 0,
          streak: 0,
          lastActiveDate: null,
        },
        labNotes: [],
      },
    ],
    posts: [],
    timelineEvents: [],
    groups: [],
  };

  // Verify live accounts (mix of default and customized profiles) migrate without losing XP, notes, or customized preferences
  const mig1Live = migrateDatabaseSchema(liveDbRaw, ACADEMY_CURRICULUM);
  assert.equal(mig1Live.db.accounts.length, liveDbRaw.accounts.length);
  for (let i = 0; i < liveDbRaw.accounts.length; i++) {
    const before = liveDbRaw.accounts[i];
    const after = mig1Live.db.accounts[i];
    assert.equal(after.user.xp, before.user.xp, 'Migration must preserve XP');
    assert.equal(after.user.streak, before.user.streak, 'Migration must preserve streak');
    assert.deepEqual(
      after.progress.completedLessonIds,
      before.progress.completedLessonIds,
      'Migration must preserve completedLessonIds'
    );
    assert.deepEqual(after.labNotes, before.labNotes, 'Migration must preserve labNotes');
    assert.ok(after.user.learningProfile, 'Account must have normalized learningProfile');

    if (before.user.learningProfile) {
      assert.deepEqual(
        after.user.learningProfile,
        normalizeLearningProfile(before.user.learningProfile),
        'Migration must preserve existing customized learningProfile without resetting preferences'
      );
    } else {
      assert.deepEqual(after.user.learningProfile, createDefaultLearningProfile());
    }
  }
  assert.deepEqual(mig1Live.db.posts, liveDbRaw.posts, 'Posts preserved');
  assert.deepEqual(mig1Live.db.groups, liveDbRaw.groups, 'Groups preserved');

  // Second pass must be completely idempotent (changed === false)
  const mig2Live = migrateDatabaseSchema(mig1Live.db, ACADEMY_CURRICULUM);
  assert.equal(mig2Live.changed, false, 'Second migration pass must be a no-op');

  // Verify isolated custom profile fixture is preserved verbatim across repeated migrations
  const customFixture = JSON.parse(JSON.stringify(v1SampleRaw));
  const expectedCustomProfile: LearningProfile = {
    interests: ['pathway-soc-detection', 'pathway-dfir'],
    experienceLevel: 'experienced',
    goals: 'Strengthen incident response and log triage depth',
    onboardingCompleted: true,
    updatedAt: '2026-11-20T00:00:00.000Z',
  };
  customFixture.accounts[0].user.learningProfile = { ...expectedCustomProfile };
  const mig1Fixture = migrateDatabaseSchema(customFixture, ACADEMY_CURRICULUM);
  assert.equal(mig1Fixture.changed, true, 'Fixture accounts lacking profiles initialize defaults');
  assert.deepEqual(
    mig1Fixture.db.accounts[0].user.learningProfile,
    expectedCustomProfile,
    'Custom learningProfile must remain intact after migration'
  );
  for (let i = 1; i < mig1Fixture.db.accounts.length; i++) {
    assert.deepEqual(
      mig1Fixture.db.accounts[i].user.learningProfile,
      createDefaultLearningProfile(),
      'Accounts without learningProfile initialize defaults'
    );
  }
  const mig2Fixture = migrateDatabaseSchema(mig1Fixture.db, ACADEMY_CURRICULUM);
  assert.equal(mig2Fixture.changed, false, 'Fixture migration pass 2 must be idempotent');

  pass(
    'Migration & Schema',
    'Check 1 & 3: Default & Customized Profiles Migrate Cleanly & Idempotently',
    `Verified ${liveDbRaw.accounts.length} live accounts and isolated default/customized fixtures preserve XP/streaks/notes/posts/groups/profiles idempotently`
  );

  // =========================================================================
  // 2, 4, 5, 6, 7, 8, 12, 13: SERVER API ENFORCEMENT, PERSISTENCE & VALIDATION
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p25c-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.writeFileSync(tmpDbPath, JSON.stringify(mig1Fixture.db, null, 2), 'utf-8');

  const srv = await startTempServer(tmpDbPath);
  try {
    // 4a. Unauthenticated requests must be rejected (401)
    const anonClient = new TestCookieClient(srv.baseUrl);
    const anonGet = await anonClient.request('GET', '/api/user/learning-profile');
    assert.equal(anonGet.status, 401, 'GET /api/user/learning-profile requires authentication');

    await anonClient.initCsrf();
    const anonPut = await anonClient.request('PUT', '/api/user/learning-profile', {
      interests: ['pathway-appsec'],
    });
    assert.equal(anonPut.status, 401, 'PUT /api/user/learning-profile requires authentication');

    // 2. Register new user -> receives valid default learningProfile
    const userClient = new TestCookieClient(srv.baseUrl);
    const reg = await userClient.request('POST', '/api/auth/register', {
      email: 'phase25c-learner@test.local',
      username: 'Phase25CLearner',
      password: 'StrongPassword!2026',
    });
    assert.equal(reg.status, 201);
    assert.ok(reg.data.user.learningProfile, 'New user registration must include default learningProfile');
    assert.deepEqual(reg.data.user.learningProfile, createDefaultLearningProfile());

    // 4b. CSRF missing or invalid origin must be rejected (403)
    const noCsrfRes = await fetch(`${srv.baseUrl}/api/user/learning-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: srv.baseUrl,
        Cookie: userClient.buildCookieHeader(),
      },
      body: JSON.stringify({ interests: ['pathway-soc-detection'] }),
    });
    assert.equal(noCsrfRes.status, 403, 'Missing X-CSRF-Token must fail with 403');

    const evilOriginRes = await fetch(`${srv.baseUrl}/api/user/learning-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        Cookie: userClient.buildCookieHeader(),
        'X-CSRF-Token': userClient.csrfToken,
      },
      body: JSON.stringify({ interests: ['pathway-soc-detection'] }),
    });
    assert.equal(evilOriginRes.status, 403, 'Cross-site Origin must fail with 403');

    // 5. Reject invalid pathway IDs, non-array, excessive items, invalid experience, long goals, PII, forged XP/completion
    const invalidPathway = await userClient.request('PUT', '/api/user/learning-profile', {
      interests: ['not-a-real-pathway'],
    });
    assert.equal(invalidPathway.status, 400);

    const nonArrayInterests = await userClient.request('PUT', '/api/user/learning-profile', {
      interests: 'pathway-appsec',
    });
    assert.equal(nonArrayInterests.status, 400);

    const tooManyInterests = await userClient.request('PUT', '/api/user/learning-profile', {
      interests: [...CANONICAL_PATHWAY_IDS, 'pathway-appsec'],
    });
    assert.equal(tooManyInterests.status, 400);

    const badExp = await userClient.request('PUT', '/api/user/learning-profile', {
      experienceLevel: 'grandmaster',
    });
    assert.equal(badExp.status, 400);

    const longGoals = await userClient.request('PUT', '/api/user/learning-profile', {
      goals: 'x'.repeat(MAX_GOALS_LENGTH + 1),
    });
    assert.equal(longGoals.status, 400);

    const piiAttempt = await userClient.request('PUT', '/api/user/learning-profile', {
      interests: ['pathway-appsec'],
      location: 'San Francisco',
    });
    assert.equal(piiAttempt.status, 400, 'Reject unknown / PII fields cleanly');

    const forgedXpAttempt = await userClient.request('PUT', '/api/user/learning-profile', {
      interests: ['pathway-appsec'],
      xp: 99999,
      completedLessonIds: ['web-owasp-top-10'],
    });
    assert.equal(forgedXpAttempt.status, 403, 'Reject forged XP / completion fields with 403');

    // 7. Skip onboarding cleanly sets onboardingCompleted: true with empty interests and 0 XP
    const skipRes = await userClient.request('PUT', '/api/user/learning-profile', {
      action: 'skip',
    });
    assert.equal(skipRes.status, 200);
    assert.equal(skipRes.data.learningProfile.onboardingCompleted, true);
    assert.deepEqual(skipRes.data.learningProfile.interests, []);
    assert.equal(skipRes.data.user.xp, 0, 'Skipping onboarding awards 0 XP');
    assert.deepEqual(skipRes.data.user.verifiedTopics, [], 'Skipping awards 0 lessons');

    // 6. Save multiple interests + experience level + goal -> persists across /api/auth/me and re-login
    const saveRes = await userClient.request('PUT', '/api/user/learning-profile', {
      action: 'save',
      interests: ['pathway-appsec', 'pathway-cloud-sec'],
      experienceLevel: 'some_experience',
      goals: 'Explore web security and AWS IAM auditing.',
    });
    assert.equal(saveRes.status, 200);
    assert.deepEqual(saveRes.data.learningProfile.interests, [
      'pathway-appsec',
      'pathway-cloud-sec',
    ]);
    assert.equal(saveRes.data.learningProfile.experienceLevel, 'some_experience');
    assert.equal(saveRes.data.learningProfile.onboardingCompleted, true);
    assert.ok(saveRes.data.learningProfile.updatedAt);
    assert.equal(saveRes.data.user.xp, 0, 'Saving interests awards 0 XP');
    assert.deepEqual(saveRes.data.user.verifiedTopics, [], 'Saving interests completes 0 lessons');

    // Public directory (/api/users) must NOT expose private learningProfile
    const publicDirRes = await anonClient.request('GET', '/api/users');
    assert.equal(publicDirRes.status, 200);
    const listedUser = (publicDirRes.data as any[]).find(
      (u) => u.username === '@Phase25CLearner'
    );
    assert.ok(listedUser);
    assert.equal(listedUser.learningProfile, undefined, 'Public directory must not leak learningProfile');

    // /api/auth/me reflects saved profile
    const meRes = await userClient.request('GET', '/api/auth/me');
    assert.equal(meRes.status, 200);
    assert.deepEqual(meRes.data.user.learningProfile.interests, [
      'pathway-appsec',
      'pathway-cloud-sec',
    ]);

    // Fresh client logging in as same user retrieves persisted profile
    const reloginClient = new TestCookieClient(srv.baseUrl);
    const loginRes = await reloginClient.request('POST', '/api/auth/login', {
      email: 'phase25c-learner@test.local',
      password: 'StrongPassword!2026',
    });
    assert.equal(loginRes.status, 200);
    assert.deepEqual(loginRes.data.user.learningProfile.interests, [
      'pathway-appsec',
      'pathway-cloud-sec',
    ]);

    // 12. Even with Stage 4/5 pathways selected in learningProfile, locked lessons STILL fail with 403 server-side!
    const lockedAppSecEntry = lessonIndex.get('web-owasp-top-10')!;
    const lockedEngage = await reloginClient.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'web-owasp-top-10',
      answers: Object.fromEntries(
        lockedAppSecEntry.lesson.quiz.map((q) => [q.id, q.correctOption])
      ),
    });
    assert.equal(
      lockedEngage.status,
      403,
      'Selecting pathway-appsec must NEVER bypass server prerequisite enforcement'
    );

    // 8. Editing and clearing interests works cleanly and preserves zero-XP invariant
    const editRes = await reloginClient.request('PUT', '/api/user/learning-profile', {
      action: 'save',
      interests: ['pathway-soc-detection'],
      experienceLevel: 'beginner',
    });
    assert.equal(editRes.status, 200);
    assert.deepEqual(editRes.data.learningProfile.interests, ['pathway-soc-detection']);

    const clearRes = await reloginClient.request('PUT', '/api/user/learning-profile', {
      action: 'clear',
    });
    assert.equal(clearRes.status, 200);
    assert.deepEqual(clearRes.data.learningProfile.interests, []);
    assert.equal(clearRes.data.learningProfile.goals, '');
    assert.equal(clearRes.data.user.xp, 0);
  } finally {
    srv.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  pass(
    'API & Security',
    'Checks 2, 4, 5, 6, 7, 8, 12, 13: Auth, CSRF, Validation, Persistence & Zero-XP Invariants',
    'Verified registration defaults, auth/CSRF rejection, strict validation, multi-interest save/edit/skip/clear, re-login persistence, and 403 prerequisite lock'
  );

  // =========================================================================
  // 9, 10, 11, 14: DETERMINISTIC RECOMMENDATIONS & UNLOCK INVARIANTS
  // =========================================================================
  // Check 14: All 8 pathways have onboarding details & topics; all 76 lessons intact
  assert.equal(SPECIALIST_PATHWAYS.length, 8);
  assert.equal(LEARNING_EXPERIENCE_OPTIONS.length, 3);
  for (const pw of SPECIALIST_PATHWAYS) {
    assert.ok(PATHWAY_ONBOARDING_DETAILS[pw.id], `Missing onboarding details for ${pw.id}`);
    assert.ok(
      getRelevantTopicsForPathway(pw.id).length >= 1,
      `Missing journey topic preview for ${pw.id}`
    );
  }
  const allMappedIds = JOURNEY_STAGES.flatMap((s) => s.topics.flatMap((t) => t.lessonIds));
  assert.equal(new Set(allMappedIds).size, 76);

  // Beginner at 0% with AppSec selected -> only unlocked foundation steps in recommendedNextActions, NEVER locked web-owasp-top-10!
  const emptyProgress = makeProgress([]);
  const appSecProfile: LearningProfile = {
    interests: ['pathway-appsec'],
    experienceLevel: 'beginner',
    goals: '',
    onboardingCompleted: true,
    updatedAt: new Date().toISOString(),
  };
  const recAppSecBeginner = computePersonalizedRecommendations(
    appSecProfile,
    ACADEMY_CURRICULUM,
    emptyProgress
  );
  assert.equal(recAppSecBeginner.isPersonalized, true);
  assert.ok(recAppSecBeginner.domainTopicIds.has('journey-appsec-devsecops'));
  assert.ok(recAppSecBeginner.domainTopicIds.has('journey-appsec-eng'));
  assert.ok(recAppSecBeginner.recommendedNextActions.length >= 1);
  for (const act of recAppSecBeginner.recommendedNextActions) {
    assert.equal(
      isLessonUnlocked(act.lesson, emptyProgress, ACADEMY_CURRICULUM),
      true,
      `Recommended next action "${act.lesson.id}" must be unlocked`
    );
    assert.equal(
      emptyProgress.completedLessonIds.includes(act.lesson.id),
      false,
      `Recommended next action "${act.lesson.id}" must not already be completed`
    );
  }
  assert.ok(
    recAppSecBeginner.lockedPathwayTargets.some((t) => t.lesson.id === 'web-owasp-top-10'),
    'Locked Stage 4 AppSec target should appear in lockedPathwayTargets preview with prerequisites'
  );
  const owaspLockedTarget = recAppSecBeginner.lockedPathwayTargets.find(
    (t) => t.lesson.id === 'web-owasp-top-10'
  )!;
  assert.ok(owaspLockedTarget.missingPrerequisites.length > 0);
  assert.equal(
    owaspLockedTarget.unlockedEntryLesson?.id,
    'comp-hardware',
    'Missing prerequisite ancestor path points back to unlocked foundation comp-hardware'
  );

  // Learner who completed http-web-arch + db-sql-foundations + auth-sessions-id + active-recon -> web-owasp-top-10 IS unlocked & recommended, and completed lessons are NEVER repeated!
  const midCompleted = [
    'comp-hardware',
    'boot-os',
    'lin-fs',
    'lin-permissions',
    'net-osi-tcp',
    'ip-subnetting',
    'infra-protocols',
    'transport-protocols',
    'switching-routing',
    'http-web-arch',
    'git-workflows',
    'markup-formats',
    'db-sql-foundations',
    'def-aaa-cia',
    'risk-threat-model',
    'auth-sessions-id',
    'pentest-method',
    'osint-passive',
    'active-recon',
  ];
  const midProgress = makeProgress(midCompleted, 2000);
  const recAppSecMid = computePersonalizedRecommendations(
    { ...appSecProfile, experienceLevel: 'some_experience' },
    ACADEMY_CURRICULUM,
    midProgress
  );
  assert.ok(
    recAppSecMid.recommendedNextActions.some((a) => a.lesson.id === 'web-owasp-top-10'),
    'Unlocked pathway lesson web-owasp-top-10 should be recommended once prerequisites are met'
  );
  for (const act of recAppSecMid.recommendedNextActions) {
    assert.equal(
      midCompleted.includes(act.lesson.id),
      false,
      `Completed lesson ${act.lesson.id} must NEVER be repeatedly recommended`
    );
    assert.equal(isLessonUnlocked(act.lesson, midProgress, ACADEMY_CURRICULUM), true);
  }
  const capstoneBRec = recAppSecMid.recommendedCapstones.find(
    (c) => c.reference.id === 'capstone-web-app-review'
  );
  assert.ok(capstoneBRec && capstoneBRec.ready === true, 'Capstone B must be recommended and ready');

  // Empty interests return clean empty personalization state
  const emptyRec = computePersonalizedRecommendations(
    createDefaultLearningProfile(),
    ACADEMY_CURRICULUM,
    midProgress
  );
  assert.equal(emptyRec.isPersonalized, false);
  assert.equal(emptyRec.recommendedNextActions.length, 0);

  // Normalize checks sanitize malformed inputs safely
  const sanitizedWeird = normalizeLearningProfile({
    interests: ['pathway-soc-detection', 'invalid-id', 'pathway-soc-detection'],
    experienceLevel: 'invalid-level',
    goals: '  hello  ',
    onboardingCompleted: 'yes',
  });
  assert.deepEqual(sanitizedWeird.interests, ['pathway-soc-detection']);
  assert.equal(sanitizedWeird.experienceLevel, 'beginner');
  assert.equal(sanitizedWeird.goals, 'hello');
  assert.equal(sanitizedWeird.onboardingCompleted, false);

  pass(
    'Recommendations',
    'Checks 9, 10, 11, 14: Canonical Mapping, Non-Repeat, Unlock Safety & Full Access',
    'Verified unlocked-only recommendations, non-repeat of completed lessons, accurate locked target prerequisites, and 76/76 + 8/8 coverage'
  );

  // =========================================================================
  // 15 & 16: PUBLIC PAYLOADS, CLASSIC COMPATIBILITY, LIVE DB ISOLATION & BUNDLE SECURITY
  // =========================================================================
  const postRunLiveBytes = fs.readFileSync(liveDbPath);
  const postRunLiveHash = crypto.createHash('sha256').update(postRunLiveBytes).digest('hex');
  assert.equal(
    postRunLiveHash,
    preRunLiveHash,
    'Tests must execute in isolated tmpDir and never mutate live database.json'
  );

  const optionalBackupPath = path.join(rootDir, 'backups', 'pre-phase2.5c-20261120-050600', 'database.json');
  const backupStatus = fs.existsSync(optionalBackupPath)
    ? (() => {
        const bh = crypto.createHash('sha256').update(fs.readFileSync(optionalBackupPath)).digest('hex');
        assert.equal(
          bh,
          'd94730b1aad0ae5434c29d23832e3ab77740fe8705fef0ce0d28dd99bd5485a3',
          'Protected pre-Phase 2.5C backup must remain byte-for-byte intact if present'
        );
        return `backup intact (${bh})`;
      })()
    : 'untracked backups/ absent on container (isolated before/after fixture verified)';

  // Scan dist/client bundle to ensure zero leaked server answers, rubrics, or solutions
  const distClientDir = path.join(rootDir, 'dist', 'client');
  assert.ok(fs.existsSync(distClientDir), 'dist/client must exist (run npm run build first)');
  const distFiles: string[] = [];
  const walkDist = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkDist(p);
      else if (ent.isFile() && /\.(js|html)$/.test(ent.name)) distFiles.push(p);
    }
  };
  walkDist(distClientDir);
  assert.ok(distFiles.length >= 1);

  const forbiddenTokens = [
    'correctOption',
    'correctIndex',
    'optionFeedback',
    'suspiciousEntryId',
    'artifactHighlightLines',
    'artifactLineRationales',
    'targetLineNumbers',
    'expectedKeywords',
  ];
  const forbiddenSolutionSnippets = ACADEMY_CAPSTONES.map((c) =>
    (c.detailedSolutionExplanation || '').slice(0, 48)
  ).filter(Boolean);

  for (const file of distFiles) {
    const raw = fs.readFileSync(file, 'utf-8');
    for (const tok of forbiddenTokens) {
      assert.equal(raw.includes(tok), false, `${file} leaked forbidden token ${tok}`);
    }
    for (const snip of forbiddenSolutionSnippets) {
      assert.equal(raw.includes(snip), false, `${file} leaked capstone solution text`);
    }
  }

  // Verify Classic 11 Tiers count remains 11 tiers, 25 topics, 76 lessons, 76 labs
  assert.equal(ACADEMY_CURRICULUM.length, 11);
  assert.equal(ACADEMY_CURRICULUM.reduce((s, t) => s + t.topics.length, 0), 25);
  assert.equal(
    ACADEMY_CURRICULUM.reduce(
      (s, t) => s + t.topics.reduce((ts, top) => ts + top.lessons.length, 0),
      0
    ),
    76
  );
  assert.equal(ALL_PRACTICAL_LABS.length, 76);

  pass(
    'Bundle & Data Integrity',
    'Checks 15 & 16: Live DB Isolation, Classic 11 Tiers & Zero Client Secret Leakage',
    `Verified live database.json unchanged (${postRunLiveHash}), ${backupStatus}, and ${distFiles.length} client bundle files clean`
  );

  console.log(`\nALL ${results.length} PHASE 2.5C VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 2.5C verification failed:', err);
  process.exit(1);
});
