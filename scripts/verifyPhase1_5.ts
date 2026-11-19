import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../src/data/practicalLabs';
import {
  indexCurriculumLessons,
  isLessonRequirementsMet,
  isLessonUnlocked,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import {
  isRedactedCredentialMarker,
  isScryptHash,
  issueSessionToken,
  verifyPassword,
} from '../src/server/auth';
import {
  DbSchema,
  migrateAccountPasswordsToScrypt,
  migrateDatabaseSchema,
} from '../src/server/migration';
import { readExistingDbSafe, saveDbAtomic, withDbLock } from '../src/server/persistence';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_5_test_session_secret_material_32chars';

async function runTests() {
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  // =========================================================================
  // 0. STATIC HYGIENE & CURRICULUM DAG INVARIANTS (ZERO PLAINTEXT AT REST)
  // =========================================================================
  const rootDir = process.cwd();
  const activeDb = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.json'), 'utf-8')) as DbSchema;
  assert.equal(activeDb.accounts.length, 6, 'All 6 original accounts preserved');
  for (const acc of activeDb.accounts) {
    assert.equal(
      isScryptHash(acc.passwordHash),
      true,
      `Active account ${acc.user.username} must use salted scrypt hash`
    );
  }
  pass('Persistence', 'Active DB Credential Check', 'All 6 active accounts have valid salted scrypt hashes');

  // Verify every backup JSON file has 0 plaintext credentials
  const backupFilesToCheck: string[] = [];
  const walkBackups = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkBackups(full);
      else if (entry.isFile() && entry.name.endsWith('.json')) backupFilesToCheck.push(full);
    }
  };
  walkBackups(path.join(rootDir, 'backups'));
  assert.ok(backupFilesToCheck.length >= 5, 'Expected historical backups under backups/');
  for (const bf of backupFilesToCheck) {
    const parsed = JSON.parse(fs.readFileSync(bf, 'utf-8'));
    if (Array.isArray(parsed?.accounts)) {
      for (const acc of parsed.accounts) {
        const ok = isScryptHash(acc.passwordHash) || isRedactedCredentialMarker(acc.passwordHash);
        assert.equal(ok, true, `Backup ${path.relative(rootDir, bf)} contains non-hashed credential`);
      }
    }
  }
  pass(
    'Backups',
    'Zero Plaintext In Backups',
    `Verified ${backupFilesToCheck.length} backup JSON artifacts contain zero plaintext credentials`
  );

  // Check curriculum integrity & difficulty inversion elimination
  const graphReport = validateCurriculumGraph(ACADEMY_CURRICULUM, ALL_PRACTICAL_LABS);
  assert.equal(graphReport.valid, true);
  assert.equal(graphReport.tierCount, 11);
  assert.equal(graphReport.topicCount, 25);
  assert.equal(graphReport.lessonCount, 76);

  const lessonIdx = indexCurriculumLessons(ACADEMY_CURRICULUM);
  const rankDiff: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const inversions: string[] = [];
  for (const entry of lessonIdx.values()) {
    const lDiff = rankDiff[entry.lesson.difficulty || 'beginner'] || 1;
    for (const pId of entry.lesson.prerequisites || []) {
      const pEntry = lessonIdx.get(pId);
      if (pEntry) {
        const pDiff = rankDiff[pEntry.lesson.difficulty || 'beginner'] || 1;
        if (lDiff < pDiff) {
          inversions.push(`${entry.lesson.id}(${entry.lesson.difficulty}) -> ${pId}(${pEntry.lesson.difficulty})`);
        }
      }
    }
  }
  assert.deepEqual(inversions, [], 'No beginner lesson may depend on intermediate/advanced prerequisite');
  const infosecLesson = lessonIdx.get('infosec-frameworks')!.lesson;
  assert.deepEqual(infosecLesson.prerequisites, ['def-aaa-cia']);
  assert.deepEqual(infosecLesson.recommendedPrerequisites, ['risk-threat-model', 'vuln-management']);
  pass(
    'Guided Learning',
    'Difficulty Inversion Check',
    '0 mandatory prerequisite difficulty inversions across all 76 lessons; infosec-frameworks verified'
  );

  // Check minQuizScorePercent helper enforcement
  const testLessonPartial = {
    ...lessonIdx.get('comp-hardware')!.lesson,
    completionRequirements: { requireQuiz: true, minQuizScorePercent: 80 },
  };
  const partialProgress = {
    completedLessonIds: [],
    completedExerciseIds: [],
    completedQuizLessonIds: ['comp-hardware'],
    completedHomeworkLessonIds: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
  };
  assert.equal(isLessonRequirementsMet(testLessonPartial, partialProgress, undefined, 75), false);
  assert.equal(isLessonRequirementsMet(testLessonPartial, partialProgress, undefined, 80), true);
  pass(
    'Guided Learning',
    'minQuizScorePercent Enforcement',
    'Verified isLessonRequirementsMet blocks < minQuizScorePercent and passes >= minQuizScorePercent'
  );

  // =========================================================================
  // 1. PERSISTENCE & RECOVERY TESTS (ISOLATED TEMP DIRECTORY)
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p15-persist-'));
  try {
    const persistDbPath = path.join(tmpDir, 'database.json');
    const initialPayload = { schemaVersion: 2, accounts: [], posts: [], timelineEvents: [], groups: [], count: 1 };
    saveDbAtomic(initialPayload, persistDbPath);

    const filesAfterSave = fs.readdirSync(tmpDir);
    assert.deepEqual(filesAfterSave, ['database.json'], 'No leftover .tmp. files after saveDbAtomic');
    assert.equal(JSON.parse(fs.readFileSync(persistDbPath, 'utf-8')).count, 1);

    // Interrupted write simulation: orphaned corrupt .tmp. file alongside valid primary DB
    const orphanTmp = `${persistDbPath}.tmp.99999.123456.deadbeef`;
    fs.writeFileSync(orphanTmp, '{"broken_incomplete_write": ', 'utf-8');
    const recovered = readExistingDbSafe(persistDbPath);
    assert.equal(recovered.exists, true);
    assert.equal(recovered.data.count, 1, 'Primary DB stays intact after interrupted write');
    assert.equal(fs.existsSync(orphanTmp), false, 'Orphaned .tmp. file cleaned up safely');

    // Failed write (circular payload) throws and leaves valid primary DB untouched
    const circular: any = { ok: true };
    circular.self = circular;
    let threwOnFailedWrite = false;
    try {
      saveDbAtomic(circular, persistDbPath);
    } catch {
      threwOnFailedWrite = true;
    }
    assert.equal(threwOnFailedWrite, true, 'saveDbAtomic must throw on failed serialization/write');
    assert.equal(JSON.parse(fs.readFileSync(persistDbPath, 'utf-8')).count, 1, 'Primary DB preserved after write error');

    // Corrupt primary DB preservation (creates .corrupt.<stamp>.json and throws, never resets to defaults)
    const corruptDbPath = path.join(tmpDir, 'corrupt-db.json');
    fs.writeFileSync(corruptDbPath, '{"accounts": [BROKEN JSON', 'utf-8');
    let threwOnCorrupt = false;
    try {
      readExistingDbSafe(corruptDbPath);
    } catch {
      threwOnCorrupt = true;
    }
    assert.equal(threwOnCorrupt, true, 'readExistingDbSafe must throw on corrupt primary DB');
    const corruptBackups = fs.readdirSync(tmpDir).filter((f) => f.includes('.corrupt.'));
    assert.equal(corruptBackups.length, 1, 'Corrupt DB preserved with .corrupt.<stamp>.json backup');

    // Concurrent withDbLock race condition test (10 parallel increments)
    const lockDbPath = path.join(tmpDir, 'lock-test.json');
    saveDbAtomic({ counter: 0 }, lockDbPath);
    await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        withDbLock(lockDbPath, async () => {
          const cur = readExistingDbSafe(lockDbPath);
          assert.equal(cur.exists, true);
          await new Promise((r) => setTimeout(r, idx % 3));
          saveDbAtomic({ counter: cur.data.counter + 1 }, lockDbPath);
        })
      )
    );
    const finalLocked = readExistingDbSafe(lockDbPath);
    assert.equal(finalLocked.exists, true);
    assert.equal(finalLocked.data.counter, 10, 'All 10 concurrent locked updates preserved');

    pass(
      'Persistence',
      'Atomic Write, Interrupted Recovery, Corrupt Preservation & Lock',
      'Verified temp+fsync+rename, orphan .tmp. cleanup, .corrupt. backup preservation, and 10-way concurrent mutex serialization'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 2. EXPRESS API INTEGRATION TESTS (AUTH, XP, GUIDED LEARNING, REGRESSION)
  // =========================================================================
  const apiTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p15-api-'));
  const tmpDbPath = path.join(apiTmpDir, 'database.json');

  // Seed isolated temp DB from baseline test-copy + add synthetic legacy plaintext account for upgrade-on-login test
  const baselineDb = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), 'utf-8')
  ) as DbSchema;

  const syntheticLegacyPass = 'LegacyUpgradeTest!2026';
  baselineDb.accounts.push({
    email: 'legacy-synthetic@test.local',
    passwordHash: syntheticLegacyPass, // intentional synthetic plaintext on isolated temp DB only
    user: {
      id: 'usr-syn-legacy',
      username: '@LegacySynthetic',
      email: 'legacy-synthetic@test.local',
      streak: 3,
      lastActiveDate: '2026-07-15',
      xp: 900,
      rank: 'Operator',
      level: 2,
      completion: 1,
      verifiedTopics: ['comp-hardware'],
      following: [],
      followers: [],
    },
    progress: {
      completedLessonIds: ['comp-hardware'],
      completedExerciseIds: [],
      completedQuizLessonIds: ['comp-hardware'],
      completedHomeworkLessonIds: [],
      xp: 900,
      streak: 3,
      lastActiveDate: '2026-07-15',
    },
    labNotes: [],
  });

  // Also test offline password migration idempotency on a clone
  const migPass1 = migrateAccountPasswordsToScrypt(baselineDb);
  assert.equal(migPass1.upgradedCount, 1, 'Only synthetic plaintext account upgraded in offline migration test');
  assert.equal(migPass1.alreadyHashedCount, 6);
  const migPass2 = migrateAccountPasswordsToScrypt(migPass1.db);
  assert.equal(migPass2.upgradedCount, 0, 'Offline migration idempotent on 2nd pass');
  pass('Authentication', 'Offline Password Migration Idempotency', '1 synthetic account upgraded on pass 1; 0 on pass 2');

  // Write the non-upgraded baselineDb (with synthetic legacy account still plaintext) to tmpDbPath to test login upgrade
  fs.writeFileSync(tmpDbPath, JSON.stringify(baselineDb, null, 2), 'utf-8');

  const { createApiApp } = await import('../server');
  const app = createApiApp(tmpDbPath, {
    sessionSecret: TEST_SECRET,
    sessionTtlSeconds: 3600,
  });

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const anonClient = new TestCookieClient(baseUrl);
    const legacyClient = new TestCookieClient(baseUrl);
    const regClient = new TestCookieClient(baseUrl);
    const learnerClient = new TestCookieClient(baseUrl);

    const requestJson = async (
      method: string,
      route: string,
      body?: any,
      clientOrRaw?: TestCookieClient | string
    ) => {
      if (clientOrRaw instanceof TestCookieClient) {
        return clientOrRaw.request(method, route, body);
      }
      if (typeof clientOrRaw === 'string') {
        const res = await fetch(`${baseUrl}${route}`, {
          method,
          headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            Origin: baseUrl,
            ...(clientOrRaw.startsWith('Cookie:')
              ? { Cookie: clientOrRaw.slice('Cookie:'.length).trim() }
              : {
                  Authorization:
                    clientOrRaw.startsWith('Bearer ') || clientOrRaw.startsWith('Raw ')
                      ? clientOrRaw
                      : `Bearer ${clientOrRaw}`,
                }),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        return { status: res.status, data: await res.json() };
      }
      return anonClient.request(method, route, body);
    };

    // --- AUTH TEST A: Legacy plaintext login + transparent scrypt upgrade ---
    const legacyLogin1 = await requestJson(
      'POST',
      '/api/auth/login',
      {
        email: 'legacy-synthetic@test.local',
        password: syntheticLegacyPass,
      },
      legacyClient
    );
    assert.equal(legacyLogin1.status, 200);
    assert.equal(legacyLogin1.data.token, undefined);
    assert.ok(legacyClient.cookies.has('cfa_session'));
    assert.equal(legacyLogin1.data.user.xp, 900);

    const diskAfterLogin = JSON.parse(fs.readFileSync(tmpDbPath, 'utf-8')) as DbSchema;
    const upgradedRec = diskAfterLogin.accounts.find((a) => a.user.id === 'usr-syn-legacy')!;
    assert.equal(isScryptHash(upgradedRec.passwordHash), true, 'Login must upgrade legacy plaintext to scrypt');
    assert.equal((await verifyPassword(syntheticLegacyPass, upgradedRec.passwordHash)).valid, true);

    // Subsequent login works cleanly with upgraded scrypt hash
    const legacyLogin2 = await requestJson(
      'POST',
      '/api/auth/login',
      {
        email: 'legacy-synthetic@test.local',
        password: syntheticLegacyPass,
      },
      legacyClient
    );
    assert.equal(legacyLogin2.status, 200);
    pass('Authentication', 'Legacy Upgrade-on-Login', 'Synthetic plaintext account verified, upgraded to scrypt on disk, and re-authenticated cleanly');

    // --- AUTH TEST B: Password policy & salted registration ---
    const weakPw = await requestJson(
      'POST',
      '/api/auth/register',
      {
        email: 'weak@test.local',
        username: 'WeakUser',
        password: '123',
      },
      regClient
    );
    assert.equal(weakPw.status, 400);

    const spacePw = await requestJson(
      'POST',
      '/api/auth/register',
      {
        email: 'space@test.local',
        username: 'SpaceUser',
        password: '        ',
      },
      regClient
    );
    assert.equal(spacePw.status, 400);

    const emailMatchPw = await requestJson(
      'POST',
      '/api/auth/register',
      {
        email: 'same@test.local',
        username: 'SameUser',
        password: 'same@test.local',
      },
      regClient
    );
    assert.equal(emailMatchPw.status, 400);

    const validReg = await requestJson(
      'POST',
      '/api/auth/register',
      {
        email: 'fresh-learner@test.local',
        username: 'FreshLearner',
        password: 'SecureOperatorPass!99',
      },
      regClient
    );
    assert.equal(validReg.status, 201);
    assert.equal(validReg.data.token, undefined);
    const learnerSessionCookie = regClient.cookies.get('cfa_session')!;
    assert.ok(learnerSessionCookie);

    const regDisk = JSON.parse(fs.readFileSync(tmpDbPath, 'utf-8')) as DbSchema;
    const freshAcc = regDisk.accounts.find((a) => a.email === 'fresh-learner@test.local')!;
    assert.equal(isScryptHash(freshAcc.passwordHash), true);
    pass('Authentication', 'Password Policy & Salted Registration', 'Rejected short/whitespace/email-matching passwords and stored salted scrypt hash');

    // --- AUTH TEST C: Raw userId, forged signature, expired session, logout revocation ---
    const rawUserIdTry = await requestJson('POST', '/api/user/sync', {}, 'Raw usr-001');
    assert.equal(rawUserIdTry.status, 401, 'Raw userId Authorization header must be rejected');

    const rawBearerTry = await requestJson('POST', '/api/user/sync', {}, 'Bearer usr-001');
    assert.equal(rawBearerTry.status, 401, 'Bearer usr-001 must be rejected');

    const rawCookieTry = await requestJson('POST', '/api/user/sync', {}, 'Cookie: cfa_session=usr-001');
    assert.equal(rawCookieTry.status, 401, 'Raw userId session cookie must be rejected');

    const expiredIssued = issueSessionToken(freshAcc.user.id, {
      secret: TEST_SECRET,
      ttlSeconds: -10,
    });
    const expiredTry = await requestJson('GET', '/api/auth/me', undefined, `Cookie: cfa_session=${expiredIssued.token}`);
    assert.equal(expiredTry.status, 401);

    const tamperedToken = learnerSessionCookie.slice(0, -4) + 'AAAA';
    const tamperedTry = await requestJson('GET', '/api/auth/me', undefined, `Cookie: cfa_session=${tamperedToken}`);
    assert.equal(tamperedTry.status, 401);

    // Logout revokes session immediately (even if stale cookie is replayed)
    const logoutRes = await requestJson('POST', '/api/auth/logout', {}, regClient);
    assert.equal(logoutRes.status, 200);
    const afterLogoutTry = await requestJson(
      'GET',
      '/api/auth/me',
      undefined,
      `Cookie: cfa_session=${learnerSessionCookie}`
    );
    assert.equal(afterLogoutTry.status, 401);
    pass('Authentication', 'Token Verification & Revocation', 'Rejected raw user ID, tampered cookie signature, expired cookie, and revoked logout session (401)');

    // Re-login as FreshLearner
    const learnerLogin = await requestJson(
      'POST',
      '/api/auth/login',
      {
        email: 'fresh-learner@test.local',
        password: 'SecureOperatorPass!99',
      },
      learnerClient
    );
    assert.equal(learnerLogin.status, 200);
    assert.equal(learnerLogin.data.token, undefined);
    assert.ok(learnerClient.cookies.has('cfa_session'));

    // --- AUTH TEST D: Cross-user impersonation & GET /api/users privacy ---
    const publicUsers = await requestJson('GET', '/api/users');
    assert.equal(publicUsers.status, 200);
    assert.ok(Array.isArray(publicUsers.data));
    for (const u of publicUsers.data) {
      assert.equal(u.id, undefined, 'GET /api/users must NOT expose internal user id');
      assert.equal(u.email, undefined, 'GET /api/users must NOT expose email');
      assert.equal(u.passwordHash, undefined, 'GET /api/users must NOT expose passwordHash');
      assert.equal(u.lastActiveDate, undefined);
      assert.ok(typeof u.username === 'string');
    }

    // FreshLearner cannot read legacySynthetic's notes even if passing userId in query/body
    const otherUserNotesAttempt = await requestJson('GET', '/api/labnotes?userId=usr-syn-legacy', undefined, learnerClient);
    assert.equal(otherUserNotesAttempt.status, 200);
    assert.deepEqual(otherUserNotesAttempt.data, []);

    const syncOtherBodyAttempt = await requestJson(
      'POST',
      '/api/user/sync',
      { userId: 'usr-001', user: { id: 'usr-001' } },
      learnerClient
    );
    assert.equal(syncOtherBodyAttempt.status, 200);
    assert.equal(syncOtherBodyAttempt.data.user.id, freshAcc.user.id, 'Authenticated session identity cannot be overridden by body userId');
    pass('Authentication', 'Public Directory Privacy & Impersonation Guard', 'GET /api/users stripped private fields; cross-user body/query injection ignored');

    // --- XP & ACTIVITY VERIFICATION TESTS ---
    const forgedSyncXp = await requestJson('POST', '/api/user/sync', { user: { xp: 99999 } }, learnerClient);
    assert.equal(forgedSyncXp.status, 403);
    const forgedSyncStreak = await requestJson('POST', '/api/user/sync', { user: { streak: 365 } }, learnerClient);
    assert.equal(forgedSyncStreak.status, 403);
    const forgedSyncLessons = await requestJson(
      'POST',
      '/api/user/sync',
      { progress: { completedLessonIds: ['cloud-security'] } },
      learnerClient
    );
    assert.equal(forgedSyncLessons.status, 403);

    const forgedEngageXp = await requestJson(
      'POST',
      '/api/user/engage',
      { engagementType: 'open_lesson', lessonId: 'comp-hardware', xpEarned: 5000 },
      learnerClient
    );
    assert.equal(forgedEngageXp.status, 400);

    const forgedPostXp = await requestJson(
      'POST',
      '/api/posts',
      { title: 'Hack XP', content: 'Trying to inject XP', xp: 5000 },
      learnerClient
    );
    assert.equal(forgedPostXp.status, 400);

    const forgedTimeline = await requestJson(
      'POST',
      '/api/timeline',
      { action: 'faked completion', xpReward: 9999 },
      learnerClient
    );
    assert.equal(forgedTimeline.status, 403);
    pass('XP Security', 'Forged XP/Streak/Timeline Rejection', 'Rejected client XP, streak, completedLessonIds, and /api/timeline spoofing');

    // Invalid quiz answer & below-threshold partial score (75% < 100%) rejected
    const compHw = lessonIdx.get('comp-hardware')!.lesson;
    const wrongQuizAnswers = Object.fromEntries(
      compHw.quiz.map((q) => [q.id, (q.correctOption + 1) % q.options.length])
    );
    const badQuiz = await requestJson(
      'POST',
      '/api/user/engage',
      { engagementType: 'submit_quiz', lessonId: 'comp-hardware', answers: wrongQuizAnswers },
      learnerClient
    );
    assert.equal(badQuiz.status, 400);

    const partialQuizAnswers = Object.fromEntries(
      compHw.quiz.map((q, idx) => [
        q.id,
        idx === 0 ? (q.correctOption + 1) % q.options.length : q.correctOption,
      ])
    );
    const partialQuiz = await requestJson(
      'POST',
      '/api/user/engage',
      { engagementType: 'submit_quiz', lessonId: 'comp-hardware', answers: partialQuizAnswers },
      learnerClient
    );
    assert.equal(partialQuiz.status, 400);
    assert.equal(partialQuiz.data.scorePercent, 75);
    assert.equal(partialQuiz.data.requiredPercent, 100);

    // Complete Step 1 diagram exploration, then test invalid practical lab answer & mismatched exerciseId
    const compHwLab = getPracticalLabForLesson('comp-hardware')!;
    for (const item of compHwLab.diagramItems!.slice(0, 3)) {
      const expRes = await requestJson(
        'POST',
        '/api/assessments/explore-lab',
        {
          lessonId: 'comp-hardware',
          labId: compHwLab.id,
          action: 'explore_diagram_item',
          itemId: item.id,
        },
        learnerClient
      );
      assert.equal(expRes.status, 200);
    }

    const wrongOption = (compHwLab.challenge.correctIndex + 1) % compHwLab.challenge.options.length;
    const badLabAnswer = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'complete_exercise',
        lessonId: 'comp-hardware',
        exerciseId: compHwLab.id,
        selectedOption: wrongOption,
      },
      learnerClient
    );
    assert.equal(badLabAnswer.status, 400);

    const bootLab = getPracticalLabForLesson('boot-os')!;
    const mismatchedLab = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'complete_exercise',
        lessonId: 'comp-hardware',
        exerciseId: bootLab.id,
        selectedOption: bootLab.challenge.correctIndex,
      },
      learnerClient
    );
    assert.equal(mismatchedLab.status, 400);

    // Confirm XP is still 0 after rejected submissions
    const meAfterRejects = await requestJson('GET', '/api/auth/me', undefined, learnerClient);
    assert.equal(meAfterRejects.data.user.xp, 0);

    // --- GUIDED LEARNING: Prerequisite enforcement before & after completion ---
    // boot-os requires comp-hardware -> must fail with 403
    const lockedOpen = await requestJson(
      'POST',
      '/api/user/engage',
      { engagementType: 'open_lesson', lessonId: 'boot-os' },
      learnerClient
    );
    assert.equal(lockedOpen.status, 403);
    assert.ok(lockedOpen.data.missingPrerequisites.some((p: any) => p.id === 'comp-hardware'));

    const lockedLab = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'complete_exercise',
        lessonId: 'boot-os',
        exerciseId: bootLab.id,
        selectedOption: bootLab.challenge.correctIndex,
      },
      learnerClient
    );
    assert.equal(lockedLab.status, 403);

    const lockedHw = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'verify_homework',
        lessonId: 'boot-os',
        terminalOutput: 'Linux version 6.8.0-generic UEFI boot ok',
      },
      learnerClient
    );
    assert.equal(lockedHw.status, 403);

    // Valid quiz on unlocked comp-hardware awards exact server XP (400) & unlocks boot-os and ctf-formats
    const correctQuizAnswers = Object.fromEntries(compHw.quiz.map((q) => [q.id, q.correctOption]));
    const goodQuiz = await requestJson(
      'POST',
      '/api/user/engage',
      { engagementType: 'submit_quiz', lessonId: 'comp-hardware', answers: correctQuizAnswers },
      learnerClient
    );
    assert.equal(goodQuiz.status, 200);
    assert.equal(goodQuiz.data.xpAwarded, compHw.quiz.length * 100);
    assert.equal(goodQuiz.data.user.xp, compHw.quiz.length * 100);
    assert.ok(goodQuiz.data.progress.completedLessonIds.includes('comp-hardware'));

    // Unlocked non-terminal lesson (ctf-formats) rejects verify_homework cleanly (400)
    const nonTermHw = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'verify_homework',
        lessonId: 'ctf-formats',
        terminalOutput: 'some command output',
      },
      learnerClient
    );
    assert.equal(nonTermHw.status, 400);

    // Valid practical lab on comp-hardware awards lab.xpReward (75)
    const goodLab = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'complete_exercise',
        lessonId: 'comp-hardware',
        exerciseId: compHwLab.id,
        selectedOption: compHwLab.challenge.correctIndex,
      },
      learnerClient
    );
    assert.equal(goodLab.status, 200);
    assert.equal(goodLab.data.xpAwarded, compHwLab.xpReward);
    let expectedXp = compHw.quiz.length * 100 + compHwLab.xpReward;
    assert.equal(goodLab.data.user.xp, expectedXp);

    // Duplicate lab/quiz awards 0 extra XP
    const dupLab = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'complete_exercise',
        lessonId: 'comp-hardware',
        exerciseId: compHwLab.id,
        selectedOption: compHwLab.challenge.correctIndex,
      },
      learnerClient
    );
    assert.equal(dupLab.status, 200);
    assert.equal(dupLab.data.xpAwarded, 0);
    assert.equal(dupLab.data.user.xp, expectedXp);

    // Now boot-os is unlocked -> bad homework fails (400), valid homework succeeds (+200 XP)
    const badHw = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'verify_homework',
        lessonId: 'boot-os',
        terminalOutput: 'invalid unrelated text 123',
      },
      learnerClient
    );
    assert.equal(badHw.status, 400);

    const goodHw = await requestJson(
      'POST',
      '/api/user/engage',
      {
        engagementType: 'verify_homework',
        lessonId: 'boot-os',
        terminalOutput:
          'Filesystem     Type      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2 ext4      100G   32G   68G  32% /',
      },
      learnerClient
    );
    assert.equal(goodHw.status, 200);
    assert.equal(goodHw.data.xpAwarded, 200);
    expectedXp += 200;
    assert.equal(goodHw.data.user.xp, expectedXp);

    // Valid post awards server-calculated +50 XP and emits server timeline event
    const validPost = await requestJson(
      'POST',
      '/api/posts',
      { title: 'Security Hardening Verified', content: 'All checks clean.', category: 'Defensive' },
      learnerClient
    );
    assert.equal(validPost.status, 201);
    expectedXp += 50;
    assert.equal(validPost.data.user.xp, expectedXp);

    const timeline = await requestJson('GET', '/api/timeline');
    assert.equal(timeline.status, 200);
    assert.ok(
      timeline.data.some((ev: any) => ev.username === '@FreshLearner' && ev.xpReward === 50),
      'Server-side timeline event emitted for verified post'
    );

    // Completed legacy lesson (e.g. usr-003 has azure-security without prereqs) stays unlocked
    const usr3Progress = migrateDatabaseSchema(baselineDb, ACADEMY_CURRICULUM).db.accounts.find(
      (a) => a.user.id === 'usr-003'
    )!.progress;
    assert.equal(
      isLessonUnlocked(lessonIdx.get('azure-security')!.lesson, usr3Progress, ACADEMY_CURRICULUM),
      true,
      'Completed migrated lesson stays accessible even without prerequisite chain'
    );

    // Recommended prerequisites never block (py-basics unlocked with markup-formats only)
    assert.equal(
      isLessonUnlocked(
        lessonIdx.get('py-basics')!.lesson,
        { ...usr3Progress, completedLessonIds: ['markup-formats'] },
        ACADEMY_CURRICULUM
      ),
      true
    );

    // infosec-frameworks unlocked when def-aaa-cia done (without intermediate risk-threat-model)
    assert.equal(
      isLessonUnlocked(
        infosecLesson,
        { ...usr3Progress, completedLessonIds: ['def-aaa-cia'] },
        ACADEMY_CURRICULUM
      ),
      true
    );

    pass(
      'XP & Guided Learning',
      'End-to-End Server Verification',
      'Verified prerequisite lock/unlock, wrong quiz/lab/homework rejections (0 XP), server-calculated XP + timeline generation, and idempotency'
    );

    // --- REGRESSION: Groq AI Tutor ---
    const tutorStatus = await requestJson('GET', '/api/ai/tutor/status');
    assert.equal(tutorStatus.status, 200);
    assert.equal(tutorStatus.data.provider, 'groq');
    assert.equal(tutorStatus.data.model, process.env.GROQ_MODEL || 'openai/gpt-oss-120b');

    const tutorUnauth = await requestJson('POST', '/api/ai/tutor', {
      lessonId: 'net-osi-tcp',
      action: 'explain_simply',
    });
    assert.equal(tutorUnauth.status, 401, 'Unauthenticated /api/ai/tutor must return 401');

    const tutorAsk = await requestJson(
      'POST',
      '/api/ai/tutor',
      {
        lessonId: 'net-osi-tcp',
        action: 'explain_simply',
      },
      learnerClient
    );
    if (tutorStatus.data.configured) {
      assert.equal(tutorAsk.status, 200);
      assert.ok(typeof tutorAsk.data.reply === 'string' && tutorAsk.data.reply.length > 20);
      pass('Regression', 'Groq AI Tutor', `Verified 401 unauth guard + live Groq AI Tutor (${tutorAsk.data.model})`);
    } else {
      assert.equal(tutorAsk.status, 503);
      pass(
        'Regression',
        'Groq AI Tutor',
        'Verified 401 unauth guard, /api/ai/tutor/status (openai/gpt-oss-120b), and 503 guard when GROQ_API_KEY is unset'
      );
    }
  } finally {
    server.close();
    fs.rmSync(apiTmpDir, { recursive: true, force: true });
  }

  console.log(`\nALL ${results.length} PHASE 1.5 VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 1.5 verification failed:', err);
  process.exit(1);
});
