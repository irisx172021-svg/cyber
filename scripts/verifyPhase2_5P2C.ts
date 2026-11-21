import assert from 'assert/strict';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Pool } from 'pg';
import {
  assertConfirmedDevNeonBranch,
  CONFIRMED_DEV_NEON_BRANCH_ID,
  CONFIRMED_DEV_NEON_ENDPOINT_PREFIX,
  CONFIRMED_DEV_NEON_PROJECT_ID,
  createDrizzleDb,
  createNeonPool,
  redactPgSecrets,
} from '../src/db/client.ts';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { getPracticalLabForLesson } from '../src/data/practicalLabs';
import { getRequiredDiagramItemCount } from '../src/server/assessments';
import { createDefaultLearningProfile } from '../src/lib/learningProfile.ts';
import {
  assertPostgresStorageReadyOrFailClosed,
  compareSourceJsonWithPg,
  verifyCutoverParityGate,
} from '../src/server/cutoverGuard.ts';
import {
  PgStorageUnavailableError,
  PostgresStore,
  resolveStorageBackend,
} from '../src/server/postgresStore.ts';
import { validateSessionSecretStrength } from '../src/server/auth.ts';
import {
  exportDbSchemaFromPostgres,
  verifyLatestEncryptedNeonBackup,
} from '../src/server/recoveryBackup.ts';
import { DEFAULT_SOURCE_DB_PATH, loadValidatedSourceJson, sha256File } from './migrateJsonToPostgres.ts';
import { TestCookieClient } from './testHttpClient.ts';

process.env.CFA_NO_LISTEN = '1';

const TEST_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  'cfa_p2c_isolated_test_session_secret_9a8f7c6e5d4b3a291817161514';

function getSetCookies(headers: Headers): string[] {
  const anyHeaders = headers as any;
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function closeServerImmediately(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
  });
}

async function startTempServer(
  createAppFn: typeof import('../server.ts')['createApiApp'],
  options: Parameters<typeof import('../server.ts')['createApiApp']>[1]
) {
  const app = createAppFn(undefined, options);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  return {
    app,
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

export async function runPhase25P2CVerification(options?: { outputPath?: string }) {
  const tracePath = '/tmp/p2c-trace.log';
  fs.writeFileSync(tracePath, `start ${new Date().toISOString()}\n`);
  const trace = (msg: string) => fs.appendFileSync(tracePath, `${new Date().toISOString()} ${msg}\n`);
  const { createApiApp } = await import('../server.ts');

  const liveJsonExists = fs.existsSync(DEFAULT_SOURCE_DB_PATH);
  const preRunLiveJsonSha = liveJsonExists ? sha256File(DEFAULT_SOURCE_DB_PATH) : null;

  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be available in the runtime to run verifyPhase2_5P2C.');
  }

  const rootPool = createNeonPool(databaseUrl);
  const drizzleDb = createDrizzleDb(rootPool);

  const createdUserIds: string[] = [];
  const createdUsernames: string[] = [];
  const createdPostIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdRevokedSids: string[] = [];
  const createdTimelineUsernames: string[] = [];

  const summary: Record<string, any> = {};

  try {
    // =========================================================================
    // 1. PRE-CUTOVER SAFETY VERIFICATION
    // =========================================================================
    trace('1.connect_check');
    const checkClient = await rootPool.connect();
    let branchIdentity: { projectId: string; branchId: string; databaseName: string };
    try {
      branchIdentity = await assertConfirmedDevNeonBranch(checkClient, databaseUrl);
      trace('1.pre_sweep');
      // Idempotent pre-sweep of any leftover isolated p2c test rows from an interrupted run
      await checkClient.query('BEGIN');
      await checkClient.query(`DELETE FROM groups WHERE name LIKE 'P2C Cutover Squad %'`);
      await checkClient.query(`DELETE FROM posts WHERE title LIKE 'P2C Cutover Report %'`);
      await checkClient.query(`DELETE FROM timeline_events WHERE username LIKE '@P2C\\_%' ESCAPE '\\'`);
      await checkClient.query(`DELETE FROM users WHERE email LIKE 'p2c-%@test.local'`);
      await checkClient.query('COMMIT');
    } catch (e) {
      await checkClient.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      checkClient.release();
    }
    trace('1.parity');

    assert.equal(branchIdentity.projectId, CONFIRMED_DEV_NEON_PROJECT_ID);
    assert.equal(branchIdentity.branchId, CONFIRMED_DEV_NEON_BRANCH_ID);
    assert.ok(databaseUrl.includes(CONFIRMED_DEV_NEON_ENDPOINT_PREFIX));
    assert.notEqual(process.env.NODE_ENV, 'production', 'Cutover must run strictly in development');

    const preParity = await verifyCutoverParityGate(drizzleDb);
    assert.equal(preParity.ok, true, `Pre-cutover parity gate failed: ${preParity.failures.join('; ')}`);
    assert.equal(preParity.accountsCount, 6);
    assert.equal(preParity.aggregateXp, 7950);
    assert.equal(preParity.completedLessonsCount, 9);

    const rawSessionSecret = (process.env.AUTH_SESSION_SECRET || '').trim();
    const sessionSecretCheck = validateSessionSecretStrength(rawSessionSecret);
    assert.equal(sessionSecretCheck.valid, true, 'AUTH_SESSION_SECRET must satisfy strength requirements');
    const backupVerification = await verifyLatestEncryptedNeonBackup(
      rootPool,
      drizzleDb,
      rawSessionSecret
    );
    assert.equal(backupVerification.ok, true, `Encrypted snapshot check failed: ${JSON.stringify(backupVerification)}`);

    const pgSnapshotBefore = await exportDbSchemaFromPostgres(drizzleDb);
    let sourceVsPg: ReturnType<typeof compareSourceJsonWithPg> | null = null;
    if (liveJsonExists) {
      const sourceJson = loadValidatedSourceJson(DEFAULT_SOURCE_DB_PATH);
      sourceVsPg = compareSourceJsonWithPg(sourceJson.db, pgSnapshotBefore);
      assert.equal(sourceVsPg.newerLegitimateActivityInJson, false);
      assert.equal(sourceVsPg.pgIsAuthoritativeBaseline, true);
    }

    summary.preCutoverSafety = {
      projectId: branchIdentity.projectId,
      branchId: branchIdentity.branchId,
      databaseName: branchIdentity.databaseName,
      nodeEnv: process.env.NODE_ENV || 'development',
      parityGate: preParity,
      encryptedBackupSnapshotKey: backupVerification.snapshotKey,
      encryptedBackupIntegrityOk: backupVerification.ok,
      sourceVsPgComparison: sourceVsPg,
    };

    // =========================================================================
    // 2. BACKEND SELECTOR & FAIL-CLOSED CONFIG CHECKS
    // =========================================================================
    assert.equal(resolveStorageBackend({ explicitBackend: 'postgres' }), 'postgres');
    assert.equal(resolveStorageBackend({ explicitBackend: 'json' }), 'json');
    assert.equal(resolveStorageBackend({ envBackend: 'POSTGRES' }), 'postgres');
    assert.throws(
      () => resolveStorageBackend({ envBackend: 'sqlite' }),
      /Invalid STORAGE_BACKEND/i
    );

    let failClosedEmptyUrl = false;
    try {
      await assertPostgresStorageReadyOrFailClosed({ databaseUrl: '' });
    } catch {
      failClosedEmptyUrl = true;
    }
    assert.equal(failClosedEmptyUrl, true);

    assert.throws(
      () => createApiApp(undefined, { storageBackend: 'postgres', databaseUrl: '' }),
      /DATABASE_URL/i
    );

    // Confirm production-vs-dev-branch protection blocks connecting NODE_ENV=production to dev Neon
    const prevEnv = process.env.NODE_ENV;
    let prodGuardBlocked = false;
    try {
      process.env.NODE_ENV = 'production';
      const guardStore = new PostgresStore({ pool: rootPool, databaseUrl });
      try {
        await guardStore.initAndVerifyReady();
      } catch (err: any) {
        if (/Refusing to connect production runtime to the Neon development/i.test(String(err?.message || err))) {
          prodGuardBlocked = true;
        }
      }
    } finally {
      if (prevEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevEnv;
    }
    assert.equal(prodGuardBlocked, true, 'Production runtime must refuse Neon development branch');

    summary.failClosedAndBranchProtection = {
      invalidBackendThrows: true,
      emptyDatabaseUrlThrows: true,
      createApiAppMissingUrlThrows: true,
      productionBlockedFromDevBranch: true,
    };

    // =========================================================================
    // 3. MAINTENANCE WRITE-FREEZE + FULL PG FEATURE E2E + CONCURRENCY
    // =========================================================================
    let isMaintenanceFrozen = true;
    const tag = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const alphaEmail = `p2c-alpha-${tag}@test.local`;
    const betaEmail = `p2c-beta-${tag}@test.local`;
    const alphaHandle = `P2C_Alpha_${tag.slice(0, 6)}`;
    const betaHandle = `P2C_Beta_${tag.slice(0, 6)}`;
    const passwordA = 'P2C_StrongPass!2026_Alpha';
    const passwordB = 'P2C_StrongPass!2026_Beta';

    const store1 = new PostgresStore({ pool: rootPool, databaseUrl });
    await store1.initAndVerifyReady();

    const srv1 = await startTempServer(createApiApp, {
      storageBackend: 'postgres',
      postgresStore: store1,
      sessionSecret: TEST_SESSION_SECRET,
      maintenanceWriteFreeze: () => isMaintenanceFrozen,
      rateLimits: {
        registerIpMax: 100,
        registerIpWindowMs: 60_000,
        loginIpMax: 200,
        loginIpWindowMs: 60_000,
        exploreUserMax: 300,
        exploreUserWindowMs: 60_000,
        exploreIpMax: 400,
        exploreIpWindowMs: 60_000,
        assessmentUserMax: 400,
        assessmentUserWindowMs: 60_000,
        assessmentIpMax: 500,
        assessmentIpWindowMs: 60_000,
        postUserMax: 50,
        postUserWindowMs: 60_000,
        voteUserMax: 200,
        voteUserWindowMs: 60_000,
        voteIpMax: 300,
        voteIpWindowMs: 60_000,
        groupCreateUserMax: 50,
        groupCreateIpMax: 50,
        groupMessageUserMax: 200,
        groupMessageIpMax: 200,
      },
    });

    let alphaSessionCookieAfterRelogin = '';
    let savedNoteId = `note-p2c-${tag}`;
    let createdGroupId = '';
    let createdPostId = '';
    let expectedAlphaXp = 0;

    try {
      const clientA = new TestCookieClient(srv1.baseUrl);
      const clientB = new TestCookieClient(srv1.baseUrl);

      // 3a. Maintenance write-freeze allows GETs and blocks writes with 503 + Retry-After
      const getDuringFreeze = await clientA.request('GET', '/api/users');
      assert.equal(getDuringFreeze.status, 200);
      assert.equal(getDuringFreeze.data.length, 6);

      const postDuringFreeze = await clientA.request('POST', '/api/auth/register', {
        email: alphaEmail,
        username: alphaHandle,
        password: passwordA,
      });
      assert.equal(postDuringFreeze.status, 503);
      assert.equal(postDuringFreeze.headers.get('retry-after'), '30');

      // Lift write freeze
      isMaintenanceFrozen = false;

      // 3b. Register Alpha & Beta -> HttpOnly cookie, zero passwordHash
      const regA = await clientA.request('POST', '/api/auth/register', {
        email: alphaEmail,
        username: alphaHandle,
        password: passwordA,
      });
      assert.equal(regA.status, 201, `Alpha register failed: ${JSON.stringify(regA.data)}`);
      const regASetCookie = getSetCookies(regA.headers).find((c) => c.startsWith('cfa_session='))!;
      assert.match(regASetCookie, /\bHttpOnly\b/i);
      const alphaFirstToken = regASetCookie.split(';')[0].slice('cfa_session='.length);
      const alphaUserId = regA.data.user.id as string;
      const alphaCanonicalUsername = regA.data.user.username as string;
      createdUserIds.push(alphaUserId);
      createdUsernames.push(alphaCanonicalUsername);
      createdTimelineUsernames.push(alphaCanonicalUsername);
      assert.equal(regA.data.user.passwordHash, undefined);

      // Duplicate registration fails 409
      const dupClient = new TestCookieClient(srv1.baseUrl);
      const dupReg = await dupClient.request('POST', '/api/auth/register', {
        email: alphaEmail.toUpperCase(),
        username: alphaHandle.toLowerCase(),
        password: passwordA,
      });
      assert.equal(dupReg.status, 409);

      const regB = await clientB.request('POST', '/api/auth/register', {
        email: betaEmail,
        username: betaHandle,
        password: passwordB,
      });
      assert.equal(regB.status, 201);
      createdUserIds.push(regB.data.user.id);
      createdUsernames.push(regB.data.user.username);
      createdTimelineUsernames.push(regB.data.user.username);

      // 3c. Logout revokes SID in PG; replay fails 401; re-login succeeds with scrypt in PG
      const logoutRes = await clientA.request('POST', '/api/auth/logout', {});
      assert.equal(logoutRes.status, 200);
      const decodedFirstPayload = JSON.parse(
        Buffer.from(alphaFirstToken.split('.')[1], 'base64url').toString('utf8')
      );
      if (decodedFirstPayload?.sid) {
        createdRevokedSids.push(decodedFirstPayload.sid);
      }

      const replayAfterLogout = await fetch(`${srv1.baseUrl}/api/auth/me`, {
        headers: { Cookie: `cfa_session=${alphaFirstToken}` },
      });
      assert.equal(replayAfterLogout.status, 401);

      const loginA = await clientA.request('POST', '/api/auth/login', {
        email: alphaEmail,
        password: passwordA,
      });
      assert.equal(loginA.status, 200);
      const reloginSet = getSetCookies(loginA.headers).find((c) => c.startsWith('cfa_session='))!;
      alphaSessionCookieAfterRelogin = reloginSet.split(';')[0].slice('cfa_session='.length);

      // 3d. Learning Profile update persisted
      const lpRes = await clientA.request('PUT', '/api/user/learning-profile', {
        interests: ['pathway-soc-detection', 'pathway-cloud-sec'],
        experienceLevel: 'experienced',
        goals: 'Validate live PostgreSQL backend cutover persistence',
        onboardingCompleted: true,
      });
      assert.equal(lpRes.status, 200, `LearningProfile PUT failed: ${JSON.stringify(lpRes.data)}`);
      assert.deepEqual(lpRes.data.learningProfile.interests, [
        'pathway-soc-detection',
        'pathway-cloud-sec',
      ]);

      // 3e. Lesson + Lab Exploration + Exercise + Concurrent Quiz Idempotency + Streak
      const lesson1 = ACADEMY_CURRICULUM[0].topics[0].lessons[0];
      const lab1 = getPracticalLabForLesson(lesson1.id)!;

      const openRes = await clientA.request('POST', '/api/user/engage', {
        engagementType: 'open_lesson',
        lessonId: lesson1.id,
      });
      assert.equal(openRes.status, 200, `open_lesson failed: ${JSON.stringify(openRes.data)}`);

      const reqDiag = getRequiredDiagramItemCount(lab1);
      for (const item of (lab1.diagramItems || []).slice(0, reqDiag)) {
        const exStep = await clientA.request('POST', '/api/assessments/explore-lab', {
          lessonId: lesson1.id,
          labId: lab1.id,
          action: 'explore_diagram_item',
          itemId: item.id,
        });
        assert.equal(exStep.status, 200, `explore_diagram_item failed: ${JSON.stringify(exStep.data)}`);
      }

      const labPass = await clientA.request('POST', '/api/user/engage', {
        engagementType: 'complete_exercise',
        lessonId: lesson1.id,
        exerciseId: lab1.id,
        selectedOption: lab1.challenge.correctIndex,
      });
      assert.equal(labPass.status, 200, `complete_exercise failed: ${JSON.stringify(labPass.data)}`);
      expectedAlphaXp += labPass.data.xpAwarded;

      trace('3e.quiz_concurrent');
      const quizAnswers = Object.fromEntries(lesson1.quiz.map((q) => [q.id, q.correctOption]));

      // Concurrent quiz submissions (4 simultaneous calls) -> atomic XP event deduplication must grant XP once
      const concurrentQuiz = await Promise.all([
        clientA.request('POST', '/api/user/engage', {
          engagementType: 'submit_quiz',
          lessonId: lesson1.id,
          answers: quizAnswers,
        }),
        clientA.request('POST', '/api/user/engage', {
          engagementType: 'submit_quiz',
          lessonId: lesson1.id,
          answers: quizAnswers,
        }),
        clientA.request('POST', '/api/user/engage', {
          engagementType: 'submit_quiz',
          lessonId: lesson1.id,
          answers: quizAnswers,
        }),
        clientA.request('POST', '/api/user/engage', {
          engagementType: 'submit_quiz',
          lessonId: lesson1.id,
          answers: quizAnswers,
        }),
      ]);
      trace('3e.quiz_concurrent_done');

      for (const r of concurrentQuiz) {
        assert.equal(r.status, 200);
      }
      const quizXpAwards = concurrentQuiz.map((r) => r.data.xpAwarded as number);
      const totalQuizAwarded = quizXpAwards.reduce((a, b) => a + b, 0);
      assert.equal(
        quizXpAwards.filter((x) => x > 0).length,
        1,
        `Concurrent duplicate quiz submission must award XP strictly once, got ${JSON.stringify(quizXpAwards)}`
      );
      expectedAlphaXp += totalQuizAwarded;

      const meAfterQuiz = await clientA.request('GET', '/api/auth/me');
      assert.equal(meAfterQuiz.status, 200);
      assert.equal(meAfterQuiz.data.user.xp, expectedAlphaXp);
      assert.equal(meAfterQuiz.data.progress.xp, expectedAlphaXp);
      assert.equal(meAfterQuiz.data.user.streak, 1);
      assert.ok(meAfterQuiz.data.progress.completedLessonIds.includes(lesson1.id));

      // 3f. Lab Notes CRUD + Cross-user ownership enforcement
      const noteSave = await clientA.request('POST', '/api/labnotes', {
        note: {
          id: savedNoteId,
          moduleId: lesson1.id,
          title: 'Cutover Verification Note',
          content: 'Persisted safely in Neon PostgreSQL.',
          updatedAt: new Date().toISOString(),
        },
      });
      assert.equal(noteSave.status, 200);
      assert.equal(noteSave.data.length, 1);

      // Beta cannot overwrite Alpha's note ID
      const betaOverwriteAttempt = await clientB.request('POST', '/api/labnotes', {
        note: {
          id: savedNoteId,
          moduleId: lesson1.id,
          title: 'Hijacked Note',
          content: 'Should be 403',
        },
      });
      assert.equal(betaOverwriteAttempt.status, 403);

      // Alpha deletes a transient second note
      const tempNoteId = `note-temp-${tag}`;
      await clientA.request('POST', '/api/labnotes', {
        note: {
          id: tempNoteId,
          moduleId: lesson1.id,
          title: 'Temp Note',
          content: 'Delete me',
        },
      });
      const delNote = await clientA.request('DELETE', `/api/labnotes/${tempNoteId}`, {});
      assert.equal(delNote.status, 200);

      // 3g. Follow relationship
      const followRes = await clientA.request('POST', '/api/users/follow', {
        targetUsername: betaHandle,
      });
      assert.equal(followRes.status, 200);
      assert.ok(followRes.data.following.includes(regB.data.user.username));

      // 3h. Community Groups (private squad, unauthorized 403, invitation + acceptance, messaging)
      const grpCreate = await clientA.request('POST', '/api/groups', {
        name: `P2C Cutover Squad ${tag.slice(0, 6)}`,
        description: 'Isolated verification squad for PostgreSQL cutover.',
        visibility: 'private',
      });
      assert.equal(grpCreate.status, 201);
      createdGroupId = grpCreate.data.id;
      createdGroupIds.push(createdGroupId);

      // Non-member Beta blocked from private group detail and self-join
      const betaDetailBlocked = await clientB.request('GET', `/api/groups/${createdGroupId}`);
      assert.equal(betaDetailBlocked.status, 403);
      const betaJoinBlocked = await clientB.request('POST', `/api/groups/${createdGroupId}/join`, {});
      assert.equal(betaJoinBlocked.status, 403);

      // Owner Alpha invites Beta; Beta accepts; Beta posts message
      const invRes = await clientA.request('POST', `/api/groups/${createdGroupId}/invitations`, {
        username: betaHandle,
      });
      assert.equal(invRes.status, 201);

      const acceptRes = await clientB.request(
        'POST',
        `/api/groups/${createdGroupId}/invitations/respond`,
        { action: 'accept' }
      );
      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.data.accepted, true);

      const msgRes = await clientB.request('POST', `/api/groups/${createdGroupId}/messages`, {
        content: `PG group message verified ${tag}`,
      });
      assert.equal(msgRes.status, 201);

      const msgsGet = await clientA.request('GET', `/api/groups/${createdGroupId}/messages`);
      assert.equal(msgsGet.status, 200);
      assert.equal(msgsGet.data.length, 1);
      assert.ok(msgsGet.data[0].content.includes(tag));

      // 3i. Forum Post creation (+50 XP) + Concurrent Voting atomicity
      const postRes = await clientA.request('POST', '/api/posts', {
        title: `P2C Cutover Report ${tag}`,
        content: 'Testing real transactional forum post and vote persistence in Neon.',
        category: 'Defensive',
      });
      assert.equal(postRes.status, 201);
      createdPostId = postRes.data.id;
      createdPostIds.push(createdPostId);
      expectedAlphaXp += postRes.data.xpAwarded;
      assert.equal(postRes.data.xpAwarded, 50);

      // Beta fires 3 concurrent upvotes -> net upvote change must be +1 (from 1 -> 2), never +3!
      const concurrentVotes = await Promise.all([
        clientB.request('POST', `/api/posts/${createdPostId}/vote`, { voteType: 'up' }),
        clientB.request('POST', `/api/posts/${createdPostId}/vote`, { voteType: 'up' }),
        clientB.request('POST', `/api/posts/${createdPostId}/vote`, { voteType: 'up' }),
      ]);
      for (const vr of concurrentVotes) {
        assert.equal(vr.status, 200);
      }
      const postsList = await clientB.request('GET', '/api/posts');
      assert.equal(postsList.status, 200);
      const fetchedPost = (postsList.data as any[]).find((p) => p.id === createdPostId);
      assert.ok(fetchedPost);
      assert.equal(fetchedPost.upvotes, 2, 'Concurrent identical upvotes must increment upvotes strictly once');
      assert.equal(fetchedPost.userVote, 'up');
      assert.equal(fetchedPost.votesByUserId, undefined);

      summary.pgFeatureCrudAndConcurrency = {
        registerLoginLogoutRevokeOk: true,
        learningProfilePersisted: true,
        concurrentQuizSingleXpAwardOk: true,
        concurrentVoteSingleDeltaOk: true,
        labNotesOwnershipProtected: true,
        followPersisted: true,
        privateGroupAccessControlAndMessagingOk: true,
        forumPostAndDailyXpOk: true,
      };
      trace('3.done_closing_srv1');
    } finally {
      await closeServerImmediately(srv1.server);
    }
    trace('4.disconnect_setup');

    // =========================================================================
    // 4. DATABASE DISCONNECTION (503 FAIL-CLOSED) & SERVER RESTART PERSISTENCE
    // =========================================================================
    // 4a. Test disconnection returns clean HTTP 503 with zero JSON fallback or secret leakage
    const disconnectPool = createNeonPool(databaseUrl);
    const disconnectStore = new PostgresStore({ pool: disconnectPool, databaseUrl });
    await disconnectStore.initAndVerifyReady();
    const srvDisconnect = await startTempServer(createApiApp, {
      storageBackend: 'postgres',
      postgresStore: disconnectStore,
      sessionSecret: TEST_SESSION_SECRET,
    });
    let disconnect503GetOk = false;
    let disconnect503AuthOk = false;
    try {
      await disconnectPool.end();

      const discUsersRes = await fetch(`${srvDisconnect.baseUrl}/api/users`);
      const discUsersBody = await discUsersRes.text();
      assert.equal(discUsersRes.status, 503);
      assert.equal(discUsersBody.includes('postgres'), false);
      assert.equal(discUsersBody.includes('neon.tech'), false);
      disconnect503GetOk = true;

      const discAuthRes = await fetch(`${srvDisconnect.baseUrl}/api/groups`, {
        headers: { Cookie: `cfa_session=${alphaSessionCookieAfterRelogin}` },
      });
      assert.equal(discAuthRes.status, 503);
      disconnect503AuthOk = true;
    } finally {
      await closeServerImmediately(srvDisconnect.server);
    }

    // 4b. Simulate full backend restart with a brand new PostgresStore & Express app
    const restartPool = createNeonPool(databaseUrl);
    const restartStore = new PostgresStore({ pool: restartPool, databaseUrl });
    await restartStore.initAndVerifyReady();
    const srvRestart = await startTempServer(createApiApp, {
      storageBackend: 'postgres',
      postgresStore: restartStore,
      sessionSecret: TEST_SESSION_SECRET,
    });
    try {
      const clientARestart = new TestCookieClient(srvRestart.baseUrl);
      // Hydrate Alpha's existing session cookie across restart (proves session & user state persist)
      const meRestartRes = await fetch(`${srvRestart.baseUrl}/api/auth/me`, {
        headers: { Cookie: `cfa_session=${alphaSessionCookieAfterRelogin}` },
      });
      assert.equal(meRestartRes.status, 200, 'Existing valid session must survive server restart');
      const meRestartData = await meRestartRes.json();
      assert.equal(meRestartData.user.xp, expectedAlphaXp);
      assert.equal(meRestartData.user.streak, 1);
      assert.deepEqual(meRestartData.user.learningProfile.interests, [
        'pathway-soc-detection',
        'pathway-cloud-sec',
      ]);
      assert.ok(meRestartData.progress.completedLessonIds.includes('comp-hardware'));

      // Beta logs in fresh after restart and reads persisted private group + messages + note + post
      const betaLoginRestart = await clientARestart.request('POST', '/api/auth/login', {
        email: betaEmail,
        password: passwordB,
      });
      assert.equal(betaLoginRestart.status, 200);

      const restartMsgs = await clientARestart.request(
        'GET',
        `/api/groups/${createdGroupId}/messages`
      );
      assert.equal(restartMsgs.status, 200);
      assert.equal(restartMsgs.data.length, 1);

      const restartPosts = await clientARestart.request('GET', '/api/posts');
      const persistedPost = (restartPosts.data as any[]).find((p) => p.id === createdPostId);
      assert.ok(persistedPost);
      assert.equal(persistedPost.upvotes, 2);

      // Alpha logs in fresh to verify lab notes persisted across restart
      const alphaFresh = new TestCookieClient(srvRestart.baseUrl);
      const alphaLogin2 = await alphaFresh.request('POST', '/api/auth/login', {
        email: alphaEmail,
        password: passwordA,
      });
      assert.equal(alphaLogin2.status, 200);
      const restartNotes = await alphaFresh.request('GET', '/api/labnotes');
      assert.equal(restartNotes.status, 200);
      assert.equal(restartNotes.data.length, 1);
      assert.equal(restartNotes.data[0].id, savedNoteId);

      // Also verify existing 6 baseline accounts remained untouched alongside test data
      const allPublicUsers = await alphaFresh.request('GET', '/api/users');
      assert.equal(allPublicUsers.status, 200);
      assert.ok(allPublicUsers.data.length >= 8);
      assert.ok(
        (allPublicUsers.data as any[]).some((u) => u.username === '@NetRunner_Zero'),
        'Baseline operator @NetRunner_Zero missing'
      );

      summary.disconnectAndRestart = {
        disconnect503GetOk,
        disconnect503AuthOk,
        sessionSurvivedRestart: true,
        xpStreakProfileLessonPersistedAcrossRestart: true,
        notesGroupsMessagesPostsPersistedAcrossRestart: true,
      };
    } finally {
      await closeServerImmediately(srvRestart.server);
      await restartPool.end();
    }
  } finally {
    // =========================================================================
    // 5. ISOLATED TEST CLEANUP & EXACT BASELINE RESTORATION CHECK
    // =========================================================================
    const cleanupClient = await rootPool.connect();
    try {
      await cleanupClient.query('BEGIN');
      if (createdGroupIds.length > 0) {
        await cleanupClient.query(`DELETE FROM groups WHERE id = ANY($1::text[])`, [createdGroupIds]);
      }
      if (createdPostIds.length > 0) {
        await cleanupClient.query(`DELETE FROM posts WHERE id = ANY($1::text[])`, [createdPostIds]);
      }
      if (createdTimelineUsernames.length > 0) {
        await cleanupClient.query(`DELETE FROM timeline_events WHERE username = ANY($1::text[])`, [
          createdTimelineUsernames,
        ]);
      }
      if (createdRevokedSids.length > 0) {
        await cleanupClient.query(`DELETE FROM revoked_sessions WHERE sid = ANY($1::text[])`, [
          createdRevokedSids,
        ]);
      }
      if (createdUserIds.length > 0) {
        await cleanupClient.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [createdUserIds]);
      }
      await cleanupClient.query('COMMIT');
    } catch (cleanupErr) {
      await cleanupClient.query('ROLLBACK').catch(() => {});
      throw cleanupErr;
    } finally {
      cleanupClient.release();
    }

    const postCleanupParity = await verifyCutoverParityGate(drizzleDb);
    const pgAfterCleanup = await exportDbSchemaFromPostgres(drizzleDb);
    const postRunLiveJsonSha = liveJsonExists ? sha256File(DEFAULT_SOURCE_DB_PATH) : null;

    summary.postCleanupBaselineVerification = {
      accountsCount: pgAfterCleanup.accounts.length,
      aggregateXp: postCleanupParity.aggregateXp,
      completedLessonsCount: postCleanupParity.completedLessonsCount,
      postsCount: pgAfterCleanup.posts.length,
      groupsCount: pgAfterCleanup.groups.length,
      groupMessagesCount: pgAfterCleanup.groups.reduce((s, g) => s + g.messages.length, 0),
      timelineEventsCount: pgAfterCleanup.timelineEvents.length,
      parityGateOk: postCleanupParity.ok,
      liveJsonUnchanged: postRunLiveJsonSha === preRunLiveJsonSha,
    };

    await rootPool.end();
  }

  const b = summary.postCleanupBaselineVerification;
  const ok =
    b?.accountsCount === 6 &&
    b?.aggregateXp === 7950 &&
    b?.completedLessonsCount === 9 &&
    b?.postsCount === 4 &&
    b?.groupsCount === 2 &&
    b?.groupMessagesCount === 3 &&
    b?.timelineEventsCount === 3 &&
    Boolean(b?.parityGateOk) &&
    Boolean(b?.liveJsonUnchanged);

  assert.equal(ok, true, `Baseline counts drifted after cleanup: ${JSON.stringify(b)}`);

  const result = { ok, summary };
  if (options?.outputPath) {
    fs.writeFileSync(options.outputPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  }
  return result;
}

const isMainEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('verifyPhase2_5P2C');

if (isMainEntry) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;

  runPhase25P2CVerification({ outputPath: outPath })
    .then((res) => {
      if (!outPath) {
        console.log(JSON.stringify(res, null, 2));
      }
      if (!res.ok) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      const safeErr = redactPgSecrets(String(err?.message || err));
      if (outPath) {
        fs.writeFileSync(
          outPath,
          JSON.stringify({ ok: false, fatalError: safeErr }, null, 2),
          { mode: 0o600 }
        );
      } else {
        console.error(safeErr);
      }
      process.exitCode = 1;
    });
}
