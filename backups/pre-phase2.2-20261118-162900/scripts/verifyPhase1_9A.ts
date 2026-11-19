import assert from 'node:assert/strict';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { getPracticalLabForLesson } from '../src/data/practicalLabs';
import { isScryptHash } from '../src/server/auth';
import { DbSchema } from '../src/server/migration';
import { TestCookieClient } from './testHttpClient';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (!addr || typeof addr === 'string') {
        srv.close(() => reject(new Error('Failed to allocate free port')));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

async function waitForServerReady(baseUrl: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/ai/tutor/status`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Production server at ${baseUrl} did not become ready within ${timeoutMs}ms`);
}

async function runTests() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const clientDistDir = path.join(distDir, 'client');
  const serverDistFile = path.join(distDir, 'server', 'server.cjs');

  // 1. Verify isolated production build structure
  assert.equal(fs.existsSync(path.join(clientDistDir, 'index.html')), true, 'dist/client/index.html must exist');
  assert.equal(fs.existsSync(serverDistFile), true, 'dist/server/server.cjs must exist');
  assert.equal(fs.existsSync(path.join(distDir, 'server.cjs')), false, 'Old dist/server.cjs must NOT exist');
  assert.equal(fs.existsSync(path.join(distDir, 'server.cjs.map')), false, 'Old dist/server.cjs.map must NOT exist');
  assert.equal(fs.existsSync(path.join(distDir, 'server', 'server.cjs.map')), false, 'Backend sourcemap must be disabled');

  const allDistFiles = listFilesRecursive(distDir).map((f) => path.relative(rootDir, f).replace(/\\/g, '/'));
  const mapFiles = allDistFiles.filter((f) => f.endsWith('.map'));
  assert.deepEqual(mapFiles, [], `No .map files may exist in dist/: found ${mapFiles.join(', ')}`);

  // Verify subsequent `vite build` does NOT delete dist/server/server.cjs
  execSync('npx vite build', { cwd: rootDir, stdio: 'pipe' });
  assert.equal(fs.existsSync(serverDistFile), true, 'Vite build must NOT delete dist/server/server.cjs');
  console.log('[PASS][Build Isolation] Layout & Vite emptyOutDir safety verified');

  // 2. Scan ALL files under dist/client/ for private artifacts or answer keys
  const clientFiles = listFilesRecursive(clientDistDir);
  const clientJsFiles = clientFiles.filter((f) => f.endsWith('.js'));
  const clientCssFiles = clientFiles.filter((f) => f.endsWith('.css'));
  assert.ok(clientJsFiles.length > 0, 'Expected frontend JS assets under dist/client/assets');
  assert.ok(clientCssFiles.length > 0, 'Expected frontend CSS assets under dist/client/assets');

  const forbiddenClientTokens = [
    'correctOption',
    'correctIndex',
    'suspiciousEntryId',
    'isSuspicious',
    'homeworkValidateRegex',
    'FALLBACK_HOMEWORK_BY_LESSON',
    'SEED_OPERATOR_DIRECTORY',
    'resolveSessionSecret',
    'DUMMY_SCRYPT_HASH',
    'applyEngagementMutation',
    '@cyberfoundations.io',
  ];

  let scannedBytes = 0;
  for (const cf of clientFiles) {
    const content = fs.readFileSync(cf, 'utf-8');
    scannedBytes += content.length;
    const rel = path.relative(rootDir, cf);
    for (const token of forbiddenClientTokens) {
      assert.equal(
        content.includes(token),
        false,
        `Public client file ${rel} must NOT contain private token "${token}"`
      );
    }
  }
  console.log(
    `[PASS][Client Artifacts] Scanned ${clientFiles.length} file(s) (${scannedBytes} bytes) under dist/client/: 0 leaks`
  );

  // 3. Extract actual JS/CSS asset URLs from dist/client/index.html
  const indexHtml = fs.readFileSync(path.join(clientDistDir, 'index.html'), 'utf-8');
  const assetMatches = Array.from(indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map((m) => m[1]);
  assert.ok(assetMatches.length >= 2, `Expected JS and CSS references in index.html, got ${assetMatches.join(', ')}`);

  // 4. Spawn ACTUAL compiled production server (node dist/server/server.cjs) on isolated DB copy
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19a-prod-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), tmpDbPath);

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const prodSecret = 'phase1_9a_production_verification_secret_material_64chars!';

  const child = spawn('node', ['dist/server/server.cjs'], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      CFA_DB_PATH: tmpDbPath,
      AUTH_SESSION_SECRET: prodSecret,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdoutLogs = '';
  let stderrLogs = '';
  child.stdout?.on('data', (d) => {
    stdoutLogs += d.toString();
  });
  child.stderr?.on('data', (d) => {
    stderrLogs += d.toString();
  });

  try {
    await waitForServerReady(baseUrl);

    // 4a. Accessible frontend entry, built assets, and SPA routes
    const rootRes = await fetch(`${baseUrl}/`);
    assert.equal(rootRes.status, 200);
    const rootHtml = await rootRes.text();
    assert.ok(rootHtml.includes('<div id="root">'));

    const httpResults: Record<string, number> = { 'GET /': rootRes.status };

    for (const assetPath of assetMatches) {
      const aRes = await fetch(`${baseUrl}${assetPath}`);
      assert.equal(aRes.status, 200, `Asset ${assetPath} must be accessible`);
      const ct = aRes.headers.get('content-type') || '';
      if (assetPath.endsWith('.js')) assert.ok(ct.includes('javascript'), `Expected JS content-type, got ${ct}`);
      if (assetPath.endsWith('.css')) assert.ok(ct.includes('css'), `Expected CSS content-type, got ${ct}`);
      httpResults[`GET ${assetPath}`] = aRes.status;
    }

    for (const spaRoute of ['/tracks', '/dashboard', '/community']) {
      const sRes = await fetch(`${baseUrl}${spaRoute}`);
      assert.equal(sRes.status, 200, `SPA route ${spaRoute} should fall back to index.html`);
      const body = await sRes.text();
      assert.ok(body.includes('<div id="root">'));
      httpResults[`GET ${spaRoute}`] = sRes.status;
    }

    // 4b. Inaccessible private artifacts & unknown API routes (must ALL return 404)
    const blockedPaths = [
      '/server.cjs',
      '/server.cjs.map',
      '/server/server.cjs',
      '/server/server.cjs.map',
      '/dist/server/server.cjs',
      '/src/server/assessments.ts',
      '/src/data/curriculum/tier1.ts',
      '/database.json',
      '/package.json',
      '/assets/',
      '/assets/nonexistent.js',
      '/api/does-not-exist',
    ];
    for (const bp of blockedPaths) {
      const bRes = await fetch(`${baseUrl}${bp}`);
      assert.equal(bRes.status, 404, `Private/missing path ${bp} must return 404, got ${bRes.status}`);
      httpResults[`GET ${bp}`] = bRes.status;
    }

    // 4c. Functional production API checks: /api/curriculum, auth, quiz & lab grading, AI Tutor status
    const currRes = await fetch(`${baseUrl}/api/curriculum`);
    assert.equal(currRes.status, 200);
    const currPayload = await currRes.json();
    assert.equal(currPayload.curriculum.length, 11);
    const totalTopics = currPayload.curriculum.reduce((a: number, t: any) => a + t.topics.length, 0);
    const totalLessons = currPayload.curriculum.reduce(
      (a: number, t: any) => a + t.topics.reduce((b: number, tp: any) => b + tp.lessons.length, 0),
      0
    );
    assert.equal(totalTopics, 25);
    assert.equal(totalLessons, 69);
    assert.equal(currPayload.labs.length, 69);
    const currText = JSON.stringify(currPayload);
    for (const key of ['"correctOption"', '"correctIndex"', '"suspiciousEntryId"', '"isSuspicious"', '"homeworkValidateRegex"']) {
      assert.equal(currText.includes(key), false, `/api/curriculum must strip ${key}`);
    }
    httpResults['GET /api/curriculum'] = currRes.status;

    const tutorStatusRes = await fetch(`${baseUrl}/api/ai/tutor/status`);
    assert.equal(tutorStatusRes.status, 200);
    const tutorStatus = await tutorStatusRes.json();
    assert.equal(tutorStatus.provider, 'groq');
    assert.equal(tutorStatus.model, process.env.GROQ_MODEL || 'openai/gpt-oss-120b');
    httpResults['GET /api/ai/tutor/status'] = tutorStatusRes.status;

    const prodClient = new TestCookieClient(baseUrl);

    const regRes = await prodClient.request('POST', '/api/auth/register', {
      email: 'prod-verify@test.local',
      username: 'ProdVerifier',
      password: 'ProdVerifyPass!2026',
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.data.token, undefined, 'Production register JSON must not contain token');
    const regCookies =
      typeof (regRes.headers as any).getSetCookie === 'function'
        ? ((regRes.headers as any).getSetCookie() as string[])
        : [];
    const regSessionCookie = regCookies.find((c) => c.startsWith('cfa_session='));
    assert.ok(regSessionCookie, 'Production register must set cfa_session cookie');
    assert.match(regSessionCookie!, /\bHttpOnly\b/i);
    assert.match(regSessionCookie!, /\bSameSite=Lax\b/i);
    assert.match(regSessionCookie!, /\bSecure\b/i);
    assert.match(regSessionCookie!, /\bPath=\/(?:;|$)/i);
    httpResults['POST /api/auth/register'] = regRes.status;

    const loginClient = new TestCookieClient(baseUrl);
    const loginRes = await loginClient.request('POST', '/api/auth/login', {
      email: 'prod-verify@test.local',
      password: 'ProdVerifyPass!2026',
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.data.token, undefined, 'Production login JSON must not contain token');
    const loginCookies =
      typeof (loginRes.headers as any).getSetCookie === 'function'
        ? ((loginRes.headers as any).getSetCookie() as string[])
        : [];
    const loginSessionCookie = loginCookies.find((c) => c.startsWith('cfa_session='));
    assert.ok(loginSessionCookie);
    assert.match(loginSessionCookie!, /\bHttpOnly\b/i);
    assert.match(loginSessionCookie!, /\bSameSite=Lax\b/i);
    assert.match(loginSessionCookie!, /\bSecure\b/i);
    httpResults['POST /api/auth/login'] = loginRes.status;

    const meRes = await loginClient.request('GET', '/api/auth/me');
    assert.equal(meRes.status, 200);
    httpResults['GET /api/auth/me'] = meRes.status;

    // Server-side quiz grading check
    const compHw = ACADEMY_CURRICULUM[0].topics[0].lessons[0];
    const answers = Object.fromEntries(compHw.quiz.map((q) => [q.id, q.correctOption]));
    const quizRes = await loginClient.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: 'comp-hardware',
      answers,
    });
    assert.equal(quizRes.status, 200);
    assert.equal(quizRes.data.passed, true);
    assert.equal(quizRes.data.xpAwarded, compHw.quiz.length * 100);
    httpResults['POST /api/user/engage (submit_quiz)'] = quizRes.status;

    // Server-side practical lab grading check
    const compLab = getPracticalLabForLesson('comp-hardware')!;
    const labRes = await loginClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compLab.id,
      selectedOption: compLab.challenge.correctIndex,
    });
    assert.equal(labRes.status, 200);
    assert.equal(labRes.data.xpAwarded, compLab.xpReward);
    httpResults['POST /api/user/engage (complete_exercise)'] = labRes.status;

    console.log('[PASS][Production HTTP Tests]', JSON.stringify(httpResults, null, 2));

    // 5. Confirm production database.json integrity
    const prodDb = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.json'), 'utf-8')) as DbSchema;
    assert.equal(prodDb.accounts.length, 6);
    for (const acc of prodDb.accounts) {
      assert.equal(isScryptHash(acc.passwordHash), true);
    }
    console.log('[PASS][Database Preservation] All 6 production accounts intact with scrypt hashes');
  } catch (err) {
    console.error('Production stdout:\n', stdoutLogs);
    console.error('Production stderr:\n', stderrLogs);
    throw err;
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 200));
    if (!child.killed) child.kill('SIGKILL');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\nALL PHASE 1.9A PRODUCTION BUILD ISOLATION CHECKS PASSED.');
}

runTests().catch((err) => {
  console.error('Phase 1.9A verification failed:', err);
  process.exit(1);
});
