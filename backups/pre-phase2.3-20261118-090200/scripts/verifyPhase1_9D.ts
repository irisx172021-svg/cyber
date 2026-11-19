import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../src/data/practicalLabs';
import { indexCurriculumLessons } from '../src/lib/curriculumProgress';
import { isScryptHash } from '../src/server/auth';
import { DbSchema } from '../src/server/migration';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_9d_test_session_secret_material_32chars';

async function startTempServer(
  dbPath: string,
  options?: Parameters<(typeof import('../server'))['createApiApp']>[1],
  withFrontend = false
) {
  const { attachFrontendMiddleware, createApiApp } = await import('../server');
  const app = createApiApp(dbPath, options);
  let viteServer: Awaited<ReturnType<typeof attachFrontendMiddleware>> | undefined;
  if (withFrontend) {
    viteServer = await attachFrontendMiddleware(app);
  }
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, viteServer, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function rawHttpGet(baseUrl: string, rawPath: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const parsed = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: rawPath,
        method: 'GET',
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const rootDir = process.cwd();
  const baseDbCopy = path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json');
  const lessonIdx = indexCurriculumLessons(ACADEMY_CURRICULUM);

  // =========================================================================
  // 1. QUIZ ANSWER-ORACLE REMOVAL & ASSESSMENT THROTTLING (SEQ + CONCURRENT)
  // =========================================================================
  const assessDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19d-assess-'));
  const assessDb = path.join(assessDir, 'database.json');
  fs.copyFileSync(baseDbCopy, assessDb);

  const assessServer = await startTempServer(assessDb, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      assessmentUserMax: 4,
      assessmentUserWindowMs: 60_000,
      assessmentIpMax: 10,
      assessmentIpWindowMs: 60_000,
    },
  });

  try {
    const userA = new TestCookieClient(assessServer.baseUrl);
    const userB = new TestCookieClient(assessServer.baseUrl);

    const regA = await userA.request('POST', '/api/auth/register', {
      email: 'p19d-a@test.local',
      username: 'OracleTesterA',
      password: 'ValidPassword!2026',
    });
    assert.equal(regA.status, 201);

    const regB = await userB.request('POST', '/api/auth/register', {
      email: 'p19d-b@test.local',
      username: 'OracleTesterB',
      password: 'ValidPassword!2026',
    });
    assert.equal(regB.status, 201);

    // Passive open_lesson calls must NOT consume assessment quota
    for (let i = 0; i < 6; i++) {
      const openRes = await userA.request('POST', '/api/user/engage', {
        engagementType: 'open_lesson',
        lessonId: 'comp-hardware',
      });
      assert.equal(openRes.status, 200);
    }

    const compHw = lessonIdx.get('comp-hardware')!.lesson;
    const partialAnswers = Object.fromEntries(
      compHw.quiz.map((q, idx) => [
        q.id,
        idx === 0 ? (q.correctOption! + 1) % q.options.length : q.correctOption,
      ])
    );

    // Failed quiz -> aggregate score only, NO questionFeedback oracle
    const failQuiz1 = await userA.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers: partialAnswers,
    });
    assert.equal(failQuiz1.status, 400);
    assert.equal(failQuiz1.data.passed, false);
    assert.equal(failQuiz1.data.scorePercent, 75);
    assert.equal(failQuiz1.data.correctCount, compHw.quiz.length - 1);
    assert.equal(failQuiz1.data.totalQuestions, compHw.quiz.length);
    assert.equal(failQuiz1.data.questionFeedback, undefined, 'Failed quiz must never leak per-question oracle');

    // Attempt #2: pass quiz
    const passAnswers = Object.fromEntries(compHw.quiz.map((q) => [q.id, q.correctOption]));
    const passQuiz = await userA.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers: passAnswers,
    });
    assert.equal(passQuiz.status, 200);
    assert.equal(passQuiz.data.passed, true);
    assert.ok(passQuiz.data.questionFeedback, 'Passed quiz retains educational explanations');

    // Attempt #3: complete Step 1 exploration then submit lab wrong answer
    const compLab = getPracticalLabForLesson('comp-hardware')!;
    for (const item of compLab.diagramItems!.slice(0, 3)) {
      const expRes = await userA.request('POST', '/api/assessments/explore-lab', {
        lessonId: 'comp-hardware',
        labId: compLab.id,
        action: 'explore_diagram_item',
        itemId: item.id,
      });
      assert.equal(expRes.status, 200);
    }
    const labWrong = await userA.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compLab.id,
      selectedOption: (compLab.challenge.correctIndex! + 1) % compLab.challenge.options.length,
    });
    assert.equal(labWrong.status, 400);
    assert.equal(labWrong.data.explanation, undefined);

    // Attempt #4: log-investigation call (reaches assessmentUserMax: 4)
    const logLab = ALL_PRACTICAL_LABS.find((l) => l.kind === 'log_investigation' && l.logEntries?.length)!;
    const logTry = await userA.request('POST', '/api/assessments/verify-log', {
      lessonId: logLab.lessonId,
      labId: logLab.id,
      entryId: logLab.logEntries![0].id,
    });
    assert.equal(logTry.status, 403); // locked lesson, still consumes assessment bucket!

    // Attempt #5: throttled -> 429 with Retry-After!
    const throttledQuiz = await userA.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers: passAnswers,
    });
    assert.equal(throttledQuiz.status, 429);
    assert.ok(Number(throttledQuiz.headers.get('retry-after')) >= 1);

    const throttledLog = await userA.request('POST', '/api/assessments/verify-log', {
      lessonId: 'comp-hardware',
      labId: logLab.id,
      entryId: logLab.logEntries![0].id,
    });
    assert.equal(throttledLog.status, 429);

    // Concurrent Promise.all burst by userB (quota 4) must not bypass assessmentUserMax: 4
    await userB.initCsrf();
    const passAnswersB = Object.fromEntries(compHw.quiz.map((q) => [q.id, q.correctOption]));
    const burst = await Promise.all(
      Array.from({ length: 6 }, () =>
        userB.request('POST', '/api/user/engage', {
          engagementType: 'submit_quiz',
          lessonId: 'comp-hardware',
          answers: passAnswersB,
        })
      )
    );
    const statuses200 = burst.filter((r) => r.status === 200).length;
    const statuses429 = burst.filter((r) => r.status === 429).length;
    assert.equal(statuses200, 4, `Expected exactly 4 allowed requests under assessmentUserMax=4, got ${statuses200}`);
    assert.equal(statuses429, 2, `Expected 2 rate-limited requests, got ${statuses429}`);

    const meB = await userB.request('GET', '/api/auth/me');
    assert.equal(meB.status, 200);
    assert.equal(meB.data.user.xp, compHw.quiz.length * 100, 'Concurrent passing quiz must award XP only once');

    // Validation bounds check
    const oversizedLesson = await userB.request('POST', '/api/user/engage', {
      engagementType: 'open_lesson',
      lessonId: 'x'.repeat(200),
    });
    assert.equal(oversizedLesson.status, 400);

    pass(
      'Assessment Security',
      'Quiz Oracle Removal & Per-User/IP Throttling',
      'Omitted questionFeedback on failed quizzes, preserved explanations on pass, enforced 429 + Retry-After sequentially and under 6x concurrent burst'
    );
  } finally {
    assessServer.server.close();
    fs.rmSync(assessDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 2. COMMUNITY PER-USER VOTING, ANTI-SPOOFING & FOLLOW VALIDATION
  // =========================================================================
  const voteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19d-vote-'));
  const voteDb = path.join(voteDir, 'database.json');
  fs.copyFileSync(baseDbCopy, voteDb);

  const voteServer = await startTempServer(voteDb, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      voteUserMax: 4,
      voteUserWindowMs: 60_000,
      voteIpMax: 12,
      voteIpWindowMs: 60_000,
      followUserMax: 2,
      followUserWindowMs: 60_000,
    },
  });

  try {
    const anon = new TestCookieClient(voteServer.baseUrl);
    const voterA = new TestCookieClient(voteServer.baseUrl);
    const voterB = new TestCookieClient(voteServer.baseUrl);

    await voterA.request('POST', '/api/auth/register', {
      email: 'voter-a@test.local',
      username: 'VoterAlpha',
      password: 'ValidPassword!2026',
    });
    await voterB.request('POST', '/api/auth/register', {
      email: 'voter-b@test.local',
      username: 'VoterBeta',
      password: 'ValidPassword!2026',
    });

    // Unauthenticated posts list preserves baseline counts & never leaks votesByUserId
    const anonPosts = await anon.request('GET', '/api/posts');
    assert.equal(anonPosts.status, 200);
    const p1Base = anonPosts.data.find((p: any) => p.id === 'post-001');
    const p2Base = anonPosts.data.find((p: any) => p.id === 'post-002');
    assert.equal(p1Base.upvotes, 42);
    assert.equal(p2Base.upvotes, 29);
    assert.equal(p2Base.userVote, null, 'Signed-out viewer must not inherit seeded sample userVote');
    assert.equal(JSON.stringify(anonPosts.data).includes('votesByUserId'), false);

    // Unauthenticated vote -> 401
    const unauthVote = await anon.request('POST', '/api/posts/post-001/vote', { voteType: 'up' });
    assert.equal(unauthVote.status, 401);

    // Role spoofing on post creation ignored (server derives role from rank)
    const spoofPost = await voterA.request('POST', '/api/posts', {
      title: 'Role Spoof Test',
      content: 'Testing server-derived forum roles.',
      category: 'General',
      authorRole: 'Instructor',
    });
    assert.equal(spoofPost.status, 201);
    assert.equal(spoofPost.data.authorRole, 'Cadet', 'Server must derive authorRole from rank, ignoring client Instructor spoof');
    assert.equal(spoofPost.data.votesByUserId, undefined);

    // Per-user voting isolation
    const vA1 = await voterA.request('POST', '/api/posts/post-001/vote', { voteType: 'up' });
    assert.equal(vA1.status, 200);
    assert.equal(vA1.data.upvotes, 43);
    assert.equal(vA1.data.userVote, 'up');
    assert.equal(vA1.data.votesByUserId, undefined);

    // Duplicate same vote by VoterA -> idempotent (stays 43)
    const vA2 = await voterA.request('POST', '/api/posts/post-001/vote', { voteType: 'up' });
    assert.equal(vA2.status, 200);
    assert.equal(vA2.data.upvotes, 43);

    // VoterB upvotes post-001 -> reaches 44 cleanly without touching VoterA's upvote
    const vB1 = await voterB.request('POST', '/api/posts/post-001/vote', { voteType: 'up' });
    assert.equal(vB1.status, 200);
    assert.equal(vB1.data.upvotes, 44);
    assert.equal(vB1.data.userVote, 'up');

    // VoterA still sees userVote: 'up' while VoterB sees userVote: 'up'; anon sees userVote: null
    const postsA = await voterA.request('GET', '/api/posts');
    assert.equal(postsA.data.find((p: any) => p.id === 'post-001').userVote, 'up');
    assert.equal(postsA.data.find((p: any) => p.id === 'post-001').upvotes, 44);

    // Voting awards zero XP
    const meA = await voterA.request('GET', '/api/auth/me');
    assert.equal(meA.data.user.xp, 50); // Only +50 XP from the single post above

    // Concurrent vote switches by VoterB serialized + throttled beyond voteUserMax=4
    const vB2 = await voterB.request('POST', '/api/posts/post-001/vote', { voteType: 'down' });
    assert.equal(vB2.status, 200);
    assert.equal(vB2.data.upvotes, 42); // 44 -> remove +1 -> apply -1 = 42
    const vB3 = await voterB.request('POST', '/api/posts/post-001/vote', { voteType: null });
    assert.equal(vB3.status, 200);
    assert.equal(vB3.data.upvotes, 43); // 42 -> remove -1 = 43 (VoterA's upvote remains)
    const vB4 = await voterB.request('POST', '/api/posts/post-001/vote', { voteType: 'up' });
    assert.equal(vB4.status, 200);
    assert.equal(vB4.data.upvotes, 44);
    const vB5 = await voterB.request('POST', '/api/posts/post-001/vote', { voteType: null });
    assert.equal(vB5.status, 429);
    assert.ok(Number(vB5.headers.get('retry-after')) >= 1);

    // Follow validation & throttle (followUserMax = 2)
    const followSelf = await voterA.request('POST', '/api/users/follow', { targetUsername: '@VoterAlpha' });
    assert.equal(followSelf.status, 400);
    const followOk = await voterA.request('POST', '/api/users/follow', { targetUsername: '@VoterBeta' });
    assert.equal(followOk.status, 200);
    const follow429 = await voterA.request('POST', '/api/users/follow', { targetUsername: '@DoesNotExist999' });
    assert.equal(follow429.status, 429);
    const followUnknown = await voterB.request('POST', '/api/users/follow', { targetUsername: '@DoesNotExist999' });
    assert.equal(followUnknown.status, 404);

    pass(
      'Community Integrity',
      'Per-User Voting, Role Anti-Spoofing & Follow Validation',
      'Verified isolated votesByUserId ledger, stripped user IDs, idempotent toggles, 429 voting cap, zero vote XP, and server-derived authorRole'
    );
  } finally {
    voteServer.server.close();
    fs.rmSync(voteDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 3. SECURITY HEADERS, CSP, PRODUCTION HSTS & SANITIZED ERROR HANDLER
  // =========================================================================
  const hdrDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19d-hdr-'));
  const hdrDb = path.join(hdrDir, 'database.json');
  fs.copyFileSync(baseDbCopy, hdrDb);

  const prevNodeEnv = process.env.NODE_ENV;
  const prevSecret = process.env.AUTH_SESSION_SECRET;
  try {
    // 3a. Dev / HTTP headers (standalone mode, no HSTS on HTTP)
    process.env.NODE_ENV = 'development';
    const devHdrSrv = await startTempServer(hdrDb, {
      sessionSecret: TEST_SECRET,
      trustedPreview: false,
    });
    try {
      const httpRes = await rawHttpGet(devHdrSrv.baseUrl, '/api/auth/csrf');
      assert.equal(httpRes.status, 200);
      assert.equal(httpRes.headers['x-content-type-options'], 'nosniff');
      assert.equal(httpRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.ok(String(httpRes.headers['permissions-policy']).includes('camera=()'));
      assert.equal(httpRes.headers['x-frame-options'], 'SAMEORIGIN');
      assert.equal(httpRes.headers['x-powered-by'], undefined);
      assert.equal(httpRes.headers['strict-transport-security'], undefined, 'HSTS must NOT be sent on HTTP dev');
      assert.ok(String(httpRes.headers['content-security-policy']).includes("frame-ancestors 'self'"));

      // Malformed JSON error test -> clean JSON 400, zero stack trace
      const badJsonRes = await fetch(`${devHdrSrv.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: devHdrSrv.baseUrl,
        },
        body: '{"broken_json":',
      });
      assert.equal(badJsonRes.status, 400);
      const badJsonText = await badJsonRes.text();
      assert.equal(badJsonText.includes('at '), false);
      assert.equal(badJsonText.includes('node_modules'), false);
    } finally {
      devHdrSrv.server.close();
    }

    // 3b. Production HTTPS headers (standalone mode: strict script-src 'self', HSTS present)
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SESSION_SECRET = TEST_SECRET;
    const prodHdrSrv = await startTempServer(hdrDb, {
      sessionSecret: TEST_SECRET,
      cookieSecure: true,
      trustedPreview: false,
    });
    try {
      const prodRes = await rawHttpGet(prodHdrSrv.baseUrl, '/api/auth/csrf');
      assert.equal(prodRes.status, 200);
      const csp = String(prodRes.headers['content-security-policy']);
      assert.ok(csp.includes("script-src 'self';"), `Production script-src must be strictly 'self', got: ${csp}`);
      assert.equal(csp.includes("'unsafe-eval'"), false);
      assert.ok(String(prodRes.headers['strict-transport-security']).includes('max-age=31536000'));
    } finally {
      prodHdrSrv.server.close();
    }

    pass(
      'Security Headers & CSP',
      'Dev/Prod Headers, Strict Production CSP, HSTS & JSON Error Handler',
      'Verified nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors, strict prod script-src self, prod HTTPS HSTS, and stack-free 400 JSON errors'
    );
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = prevSecret;
    fs.rmSync(hdrDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 4. DEV VITE MIDDLEWARE & PRODUCTION PATH BLOCKING
  // =========================================================================
  const pathDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19d-path-'));
  const pathDb = path.join(pathDir, 'database.json');
  fs.copyFileSync(baseDbCopy, pathDb);

  const sensitivePaths = [
    '/database.json',
    '/database.json?raw',
    '/Database.JSON',
    '/.env',
    '/.env.example',
    '/%2eenv',
    '/.git/config',
    '/src/server/assessments.ts',
    '/src/server/assessments.ts?raw',
    '/src/server%2fassessments.ts',
    '/src/data/curriculum.ts',
    '/src/data/curriculum/tier1.ts',
    '/src/data/practicalLabs/index.ts',
    '/backups/pre-phase1/database.test-copy.json',
    '/scripts/verifyPhase1_9D.ts',
    '/package.json',
    '/vite.config.ts',
    '/server.ts',
    '/dist/server/server.cjs',
    '/dist/client/assets/index.js.map',
    '/../database.json',
    '/%2e%2e/database.json',
    '/assets/%2e%2e/%2e%2e/database.json',
    '/@fs/app/applet/database.json',
  ];

  try {
    // 4a. Real Vite Dev Middleware mode
    process.env.NODE_ENV = 'development';
    const prevDisableHmr = process.env.DISABLE_HMR;
    process.env.DISABLE_HMR = 'true';
    const devAppSrv = await startTempServer(pathDb, { sessionSecret: TEST_SECRET }, true);
    try {
      for (const sp of sensitivePaths) {
        const res = await rawHttpGet(devAppSrv.baseUrl, sp);
        assert.equal(res.status, 404, `Dev mode must block ${sp} with 404, got ${res.status}`);
      }
      const api404 = await rawHttpGet(devAppSrv.baseUrl, '/api/unknown-route');
      assert.equal(api404.status, 404);
      assert.ok(api404.headers['content-type']?.includes('application/json'));
      assert.equal(JSON.parse(api404.body).error, 'API endpoint not found.');

      // Legitimate client sources still work in Vite dev mode
      const indexDev = await rawHttpGet(devAppSrv.baseUrl, '/');
      assert.equal(indexDev.status, 200);
      assert.ok(indexDev.body.includes('<div id="root">'));

      const safeMetaModule = await rawHttpGet(devAppSrv.baseUrl, '/src/data/curriculumMetadata.ts');
      assert.equal(safeMetaModule.status, 200);
    } finally {
      devAppSrv.server.close();
      await devAppSrv.viteServer?.close();
      if (prevDisableHmr === undefined) delete process.env.DISABLE_HMR;
      else process.env.DISABLE_HMR = prevDisableHmr;
    }

    // 4b. Production static + SPA fallback mode
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SESSION_SECRET = TEST_SECRET;
    const prodAppSrv = await startTempServer(pathDb, { sessionSecret: TEST_SECRET }, true);
    try {
      for (const sp of sensitivePaths) {
        const res = await rawHttpGet(prodAppSrv.baseUrl, sp);
        assert.equal(res.status, 404, `Prod mode must block ${sp} with 404, got ${res.status}`);
      }
      const indexProd = await rawHttpGet(prodAppSrv.baseUrl, '/');
      assert.equal(indexProd.status, 200);
      assert.ok(indexProd.body.includes('<div id="root">'));

      const api404 = await rawHttpGet(prodAppSrv.baseUrl, '/api/unknown-route');
      assert.equal(api404.status, 404);
      assert.ok(api404.headers['content-type']?.includes('application/json'));
    } finally {
      prodAppSrv.server.close();
    }

    pass(
      'Source & Path Hardening',
      'Dev Vite Middleware + Prod Static Sensitive File & Traversal Blocking',
      `Blocked ${sensitivePaths.length} sensitive/encoded/traversal paths across both dev Vite middleware and prod static serving while keeping SPA & client modules functional`
    );
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = prevSecret;
    fs.rmSync(pathDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 5. PRODUCTION DATABASE.JSON PRESERVATION
  // =========================================================================
  const prodDb = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.json'), 'utf-8')) as DbSchema;
  assert.equal(prodDb.accounts.length, 6);
  for (const acc of prodDb.accounts) {
    assert.equal(isScryptHash(acc.passwordHash), true);
  }
  const prodP1 = prodDb.posts.find((p) => p.id === 'post-001');
  const prodP2 = prodDb.posts.find((p) => p.id === 'post-002');
  assert.ok(prodP1 && prodP1.upvotes === 42);
  assert.ok(prodP2 && prodP2.upvotes === 29);

  pass(
    'Data Preservation',
    'Production database.json Accounts & Historical Posts Integrity',
    `Verified all ${prodDb.accounts.length} original accounts and historical forum posts preserved unmodified`
  );

  console.log(`\nALL ${results.length} PHASE 1.9D SECURITY VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 1.9D verification failed:', err);
  process.exit(1);
});
