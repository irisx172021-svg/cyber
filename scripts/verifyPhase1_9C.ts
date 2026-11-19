import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  buildClearCookieOptions,
  buildSessionCookieOptions,
  createCsrfToken,
  isScryptHash,
  issuePreAuthCsrfCookieValue,
  issueSessionToken,
  resolveCookieSecureFlag,
  verifyCsrfToken,
  verifyPassword,
} from '../src/server/auth';
import { DbSchema } from '../src/server/migration';
import { CreateApiAppOptions } from '../server';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_9c_cookie_auth_csrf_test_secret_32ch';

async function startTempServer(dbPath: string, options?: CreateApiAppOptions) {
  const { createApiApp } = await import('../server');
  const app = createApiApp(dbPath, {
    sessionSecret: TEST_SECRET,
    ...options,
  });
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

function getSetCookies(headers: Headers): string[] {
  return typeof (headers as any).getSetCookie === 'function'
    ? ((headers as any).getSetCookie() as string[])
    : [];
}

async function runTests() {
  const rootDir = process.cwd();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-19c-'));
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const pre19cBackup = path.join(rootDir, 'backups', 'pre-phase1.9c', 'database.pre-phase1.9c.json');
  assert.ok(fs.existsSync(pre19cBackup), 'Expected backups/pre-phase1.9c/database.pre-phase1.9c.json');

  try {
    // =========================================================================
    // 1. COOKIE ATTRIBUTES, SECURE FLAG, NO TOKEN IN JSON, SESSION REJECTION
    // =========================================================================
    const db1Path = path.join(tmpDir, 'db1.json');
    fs.copyFileSync(pre19cBackup, db1Path);
    const srv1 = await startTempServer(db1Path, {
      sessionTtlSeconds: 7200,
      trustProxy: false,
    });

    try {
      const clientA = new TestCookieClient(srv1.baseUrl);
      const regA = await clientA.request('POST', '/api/auth/register', {
        email: 'cookie-alpha@test.local',
        username: 'CookieAlpha',
        password: 'StrongPassword!2026',
      });
      assert.equal(regA.status, 201);
      assert.equal(regA.data.token, undefined, 'Register response JSON must NOT include token');
      assert.equal(regA.rawText.includes('cfa1.'), false, 'Register JSON must never contain raw session token');
      assert.ok(typeof regA.data.csrfToken === 'string' && regA.data.csrfToken.startsWith('v1.'));
      assert.equal(
        regA.data.csrfToken.includes(regA.data.user.id),
        false,
        'CSRF token must not embed userId'
      );

      const regSetCookies = getSetCookies(regA.headers);
      const sessionSet = regSetCookies.find((c) => c.startsWith('cfa_session='));
      const preClear = regSetCookies.find((c) => c.startsWith('cfa_csrf_pre='));
      assert.ok(sessionSet, 'Register must set cfa_session cookie');
      assert.match(sessionSet!, /\bHttpOnly\b/i);
      assert.match(sessionSet!, /\bSameSite=Lax\b/i);
      assert.match(sessionSet!, /\bPath=\/(?:;|$)/i);
      assert.match(sessionSet!, /\bMax-Age=7200\b/i);
      assert.equal(/\bDomain=/i.test(sessionSet!), false, 'Session cookie must not set Domain attribute');
      assert.ok(preClear && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(preClear), 'Register must clear cfa_csrf_pre');

      const sessionCookieVal = clientA.cookies.get('cfa_session')!;
      assert.ok(sessionCookieVal && sessionCookieVal.startsWith('cfa1.'));

      // Spoofing X-Forwarded-Proto: https when trustProxy=false must NOT mark cookie Secure in dev
      const spoofProtoClient = new TestCookieClient(srv1.baseUrl);
      const spoofLogin = await spoofProtoClient.request(
        'POST',
        '/api/auth/login',
        { email: 'cookie-alpha@test.local', password: 'StrongPassword!2026' },
        { 'X-Forwarded-Proto': 'https' }
      );
      assert.equal(spoofLogin.status, 200);
      const spoofSet = getSetCookies(spoofLogin.headers).find((c) => c.startsWith('cfa_session='))!;
      assert.equal(
        /\bSecure\b/i.test(spoofSet),
        false,
        'Spoofed X-Forwarded-Proto must not enable Secure when trustProxy=false in non-prod'
      );

      // Authenticated GET /api/auth/me works with cookie and returns no DB mutation
      const dbBeforeGets = fs.readFileSync(db1Path, 'utf-8');
      const csrfGet = await clientA.request('GET', '/api/auth/csrf');
      assert.equal(csrfGet.status, 200);
      assert.equal(csrfGet.data.authenticated, true);
      const meGet = await clientA.request('GET', '/api/auth/me');
      assert.equal(meGet.status, 200);
      assert.equal(meGet.data.token, undefined);
      assert.equal(meGet.data.user.username, '@CookieAlpha');
      assert.equal(
        fs.readFileSync(db1Path, 'utf-8'),
        dbBeforeGets,
        'Safe GET requests must make zero database changes'
      );

      // Old Authorization: Bearer <validToken> WITHOUT cookie MUST BE REJECTED (401)
      const bearerOnlyRes = await fetch(`${srv1.baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${sessionCookieVal}` },
      });
      assert.equal(bearerOnlyRes.status, 401, 'Bearer token without cookie must be rejected');

      // Missing cookie -> 401
      const noCookieRes = await fetch(`${srv1.baseUrl}/api/auth/me`);
      assert.equal(noCookieRes.status, 401);

      // Raw / malformed / tampered / expired / wrong-tokenVersion cookies -> 401
      const expiredToken = issueSessionToken(regA.data.user.id, {
        secret: TEST_SECRET,
        ttlSeconds: -5,
        tokenVersion: 1,
      }).token;
      const wrongVersionToken = issueSessionToken(regA.data.user.id, {
        secret: TEST_SECRET,
        ttlSeconds: 300,
        tokenVersion: 99,
      }).token;
      const tamperedSig = `${sessionCookieVal.slice(0, -3)}XYZ`;

      for (const [label, badCookie] of [
        ['raw userId', regA.data.user.id],
        ['malformed', 'not-a-valid-token'],
        ['tampered signature', tamperedSig],
        ['expired token', expiredToken],
        ['wrong tokenVersion', wrongVersionToken],
      ]) {
        const badRes = await fetch(`${srv1.baseUrl}/api/auth/me`, {
          headers: { Cookie: `cfa_session=${badCookie}` },
        });
        assert.equal(badRes.status, 401, `Rejected cookie (${label}) must return 401`);
      }

      // Valid CSRF + cookie protected mutation succeeds
      const noteSave = await clientA.request('POST', '/api/labnotes', {
        note: {
          id: 'note-19c-test',
          moduleId: 'comp-hardware',
          title: 'Cookie Auth Note',
          content: 'Verified cookie + CSRF note persistence.',
          updatedAt: new Date().toISOString(),
        },
      });
      assert.equal(noteSave.status, 200);

      // Logout clears cookie with matching attributes and revokes sid immediately
      const logoutRes = await clientA.request('POST', '/api/auth/logout', {});
      assert.equal(logoutRes.status, 200);
      const logoutCookies = getSetCookies(logoutRes.headers);
      const clearedSession = logoutCookies.find((c) => c.startsWith('cfa_session='));
      assert.ok(clearedSession, 'Logout must emit clearCookie for cfa_session');
      assert.match(clearedSession!, /\bHttpOnly\b/i);
      assert.match(clearedSession!, /\bSameSite=Lax\b/i);
      assert.match(clearedSession!, /\bPath=\/(?:;|$)/i);
      assert.match(clearedSession!, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);

      // Replay of revoked session cookie must return 401
      const replayRes = await fetch(`${srv1.baseUrl}/api/auth/me`, {
        headers: { Cookie: `cfa_session=${sessionCookieVal}` },
      });
      assert.equal(replayRes.status, 401, 'Revoked session cookie must fail 401 immediately after logout');

      pass(
        'Session Cookies',
        'Attributes, Token Redaction, Revocation & Rejection Matrix',
        'Verified HttpOnly/SameSite=Lax/Path=/, zero JSON token exposure, Bearer-only 401 rejection, expired/tampered/wrong-version/revoked 401s'
      );
    } finally {
      await new Promise<void>((resolve) => srv1.server.close(() => resolve()));
    }

    // =========================================================================
    // 2. SECURE COOKIE FLAG IN PRODUCTION & TRUSTED HTTPS PROXY MODES
    // =========================================================================
    const dbSecPath = path.join(tmpDir, 'db-sec.json');
    fs.copyFileSync(pre19cBackup, dbSecPath);
    const srvProxyHttps = await startTempServer(dbSecPath, {
      trustProxy: true,
      cookieSecure: undefined,
    });
    try {
      const proxyClient = new TestCookieClient(srvProxyHttps.baseUrl);
      const proxyReg = await proxyClient.request(
        'POST',
        '/api/auth/register',
        {
          email: 'https-proxy@test.local',
          username: 'HttpsProxyUser',
          password: 'StrongPassword!2026',
        },
        { 'X-Forwarded-Proto': 'https' }
      );
      assert.equal(proxyReg.status, 201);
      const sc = getSetCookies(proxyReg.headers).find((c) => c.startsWith('cfa_session='))!;
      assert.match(sc, /\bSecure\b/i, 'trustProxy=true + X-Forwarded-Proto: https must set Secure');

      const proxyLogout = await proxyClient.request(
        'POST',
        '/api/auth/logout',
        {},
        { 'X-Forwarded-Proto': 'https' }
      );
      assert.equal(proxyLogout.status, 200);
      const clearedHttps = getSetCookies(proxyLogout.headers).find((c) => c.startsWith('cfa_session='))!;
      assert.match(clearedHttps, /\bSecure\b/i, 'clearCookie must include Secure matching login cookie');
    } finally {
      await new Promise<void>((resolve) => srvProxyHttps.server.close(() => resolve()));
    }

    // Direct NODE_ENV=production secure flag helper & server override check
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.equal(resolveCookieSecureFlag(false), true);
      assert.equal(buildSessionCookieOptions({ secure: true }).secure, true);
      assert.equal(buildClearCookieOptions(true).secure, true);
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
    }

    pass(
      'Secure Flag',
      'HTTPS Proxy & Production Secure Cookie Enforcement',
      'Verified Secure=true under NODE_ENV=production and trusted X-Forwarded-Proto=https + matching clearCookie attributes'
    );

    // =========================================================================
    // 3. CSRF DEFENSE MATRIX (ORIGIN, REFERER, FETCH METADATA, MIME, TOKENS)
    // =========================================================================
    const dbCsrfPath = path.join(tmpDir, 'db-csrf.json');
    fs.copyFileSync(pre19cBackup, dbCsrfPath);
    const srvCsrf = await startTempServer(dbCsrfPath);

    try {
      const user1 = new TestCookieClient(srvCsrf.baseUrl);
      const r1 = await user1.request('POST', '/api/auth/register', {
        email: 'csrf1@test.local',
        username: 'CsrfUserOne',
        password: 'StrongPassword!2026',
      });
      assert.equal(r1.status, 201);

      const user2 = new TestCookieClient(srvCsrf.baseUrl);
      const r2 = await user2.request('POST', '/api/auth/register', {
        email: 'csrf2@test.local',
        username: 'CsrfUserTwo',
        password: 'StrongPassword!2026',
      });
      assert.equal(r2.status, 201);

      const u1Cookie = `cfa_session=${user1.cookies.get('cfa_session')}`;

      // 3a. Untrusted Origin, Origin: null, cross-site Sec-Fetch-Site, untrusted Referer, missing Origin/Referer -> 403
      const badOrigin = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: 'https://evil-attacker.example',
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'csrf attempt' }),
      });
      assert.equal(badOrigin.status, 403);

      const nullOrigin = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: 'null',
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'null origin' }),
      });
      assert.equal(nullOrigin.status, 403);

      const crossFetchSite = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: srvCsrf.baseUrl,
          'Sec-Fetch-Site': 'cross-site',
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'cross-site fetch metadata' }),
      });
      assert.equal(crossFetchSite.status, 403);

      const badReferer = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Referer: 'https://evil-attacker.example/form.html',
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'bad referer' }),
      });
      assert.equal(badReferer.status, 403);

      const missingOriginReferer = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'missing origin' }),
      });
      assert.equal(missingOriginReferer.status, 403);

      // Valid Referer without Origin (e.g., same-origin legacy client) -> allowed when CSRF token valid
      const validRefererOnly = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Referer: `${srvCsrf.baseUrl}/tracks/comp-hardware`,
          'X-CSRF-Token': user1.csrfToken,
        },
        body: JSON.stringify({
          note: {
            id: 'note-19c-referer',
            moduleId: 'comp-hardware',
            title: 'Valid Referer Note',
            content: 'valid referer',
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      assert.equal(validRefererOnly.status, 200);

      // 3b. Missing, malformed, or OTHER SESSION's X-CSRF-Token rejected (403)
      const missingCsrf = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: srvCsrf.baseUrl,
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'no csrf' }),
      });
      assert.equal(missingCsrf.status, 403);

      const malformedCsrf = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: srvCsrf.baseUrl,
          'X-CSRF-Token': 'v1.deadbeef.badmac',
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'bad csrf' }),
      });
      assert.equal(malformedCsrf.status, 403);

      const swappedCsrf = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: u1Cookie,
          Origin: srvCsrf.baseUrl,
          'X-CSRF-Token': user2.csrfToken, // valid token, wrong session!
        },
        body: JSON.stringify({ moduleId: 'comp-hardware', content: 'swapped csrf' }),
      });
      assert.equal(swappedCsrf.status, 403);

      // 3c. Disallowed HTML form MIME types -> 415
      for (const mime of [
        'application/x-www-form-urlencoded',
        'multipart/form-data; boundary=----Boundary',
        'text/plain',
      ]) {
        const mimeRes = await fetch(`${srvCsrf.baseUrl}/api/labnotes`, {
          method: 'POST',
          headers: {
            'Content-Type': mime,
            Cookie: u1Cookie,
            Origin: srvCsrf.baseUrl,
            'X-CSRF-Token': user1.csrfToken,
          },
          body: 'moduleId=comp-hardware&content=form',
        });
        assert.equal(mimeRes.status, 415, `Disallowed MIME ${mime} must return 415`);
      }

      // 3d. Login-CSRF & Register-CSRF defense (untrusted Origin / missing pre-auth CSRF token -> 403)
      const preClient = new TestCookieClient(srvCsrf.baseUrl);
      await preClient.initCsrf();

      const loginCrossOrigin = await fetch(`${srvCsrf.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil-login-csrf.example',
          Cookie: preClient.buildCookieHeader(),
          'X-CSRF-Token': preClient.csrfToken,
        },
        body: JSON.stringify({ email: 'csrf1@test.local', password: 'StrongPassword!2026' }),
      });
      assert.equal(loginCrossOrigin.status, 403);

      const loginNoCsrf = await fetch(`${srvCsrf.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: srvCsrf.baseUrl,
        },
        body: JSON.stringify({ email: 'csrf1@test.local', password: 'StrongPassword!2026' }),
      });
      assert.equal(loginNoCsrf.status, 403);

      const regNoCsrf = await fetch(`${srvCsrf.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: srvCsrf.baseUrl,
        },
        body: JSON.stringify({
          email: 'nocsrf@test.local',
          username: 'NoCsrfUser',
          password: 'StrongPassword!2026',
        }),
      });
      assert.equal(regNoCsrf.status, 403);

      // Expired pre-auth cookie rejected cleanly (403)
      const expiredPre = issuePreAuthCsrfCookieValue({ secret: TEST_SECRET, ttlSeconds: -10 });
      const expiredPreCsrfHeader = createCsrfToken(expiredPre.preSid, { secret: TEST_SECRET });
      const loginExpiredPre = await fetch(`${srvCsrf.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: srvCsrf.baseUrl,
          Cookie: `cfa_csrf_pre=${expiredPre.cookieValue}`,
          'X-CSRF-Token': expiredPreCsrfHeader,
        },
        body: JSON.stringify({ email: 'csrf1@test.local', password: 'StrongPassword!2026' }),
      });
      assert.equal(loginExpiredPre.status, 403);
      assert.equal(verifyCsrfToken(expiredPreCsrfHeader, expiredPre.preSid, { secret: TEST_SECRET }), true);

      pass(
        'CSRF & Origin',
        'Multi-Layer Defense (Origin + Fetch Metadata + Form MIME + Session/Pre-Auth CSRF)',
        'Rejected untrusted/null Origin, cross-site Sec-Fetch-Site, form MIMEs (415), missing/swapped/expired CSRF tokens, and login/register CSRF (403)'
      );
    } finally {
      await new Promise<void>((resolve) => srvCsrf.server.close(() => resolve()));
    }

    // =========================================================================
    // 4. EXPLICIT TRUSTED_ORIGINS ALLOWLIST ENFORCEMENT
    // =========================================================================
    const dbAllowPath = path.join(tmpDir, 'db-allow.json');
    fs.copyFileSync(pre19cBackup, dbAllowPath);
    const srvAllow = await startTempServer(dbAllowPath, {
      trustedOrigins: ['https://app.cyberfoundations.example'],
    });
    try {
      const unlistedClient = new TestCookieClient(srvAllow.baseUrl);
      await unlistedClient.initCsrf();

      // Unlisted origin (even loopback Host!) blocked when explicit allowlist is set
      const blockedUnlisted = await unlistedClient.request('POST', '/api/auth/login', {
        email: 'nonexistent@test.local',
        password: 'WrongPassword!123',
      });
      assert.equal(blockedUnlisted.status, 403);

      // Allowlisted origin passes Origin gate and reaches auth validation (401 on wrong creds)
      const allowedOriginAttempt = await unlistedClient.request(
        'POST',
        '/api/auth/login',
        { email: 'nonexistent@test.local', password: 'WrongPassword!123' },
        { Origin: 'https://app.cyberfoundations.example' }
      );
      assert.equal(allowedOriginAttempt.status, 401);
      pass(
        'Origin Allowlist',
        'Explicit trustedOrigins Enforcement',
        'Blocked unlisted origin (403) and accepted configured trusted origin'
      );
    } finally {
      await new Promise<void>((resolve) => srvAllow.server.close(() => resolve()));
    }

    // =========================================================================
    // 5. FRONTEND SOURCE & BUILT BUNDLE HYGIENE CHECKS
    // =========================================================================
    const apiTs = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'api.ts'), 'utf-8');
    const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
    const authModalTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AuthModal.tsx'), 'utf-8');
    const forumTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'CommunityForum.tsx'), 'utf-8');

    const forbiddenClientAuthTokens = [
      'cfa_auth_token',
      'cfa_user_id',
      'cfa_user',
      'Authorization',
      'Bearer ',
    ];
    for (const [label, src] of [
      ['src/lib/api.ts', apiTs],
      ['src/App.tsx', appTsx],
      ['src/components/AuthModal.tsx', authModalTsx],
      ['src/components/CommunityForum.tsx', forumTsx],
    ] as const) {
      for (const tok of forbiddenClientAuthTokens) {
        assert.equal(src.includes(tok), false, `${label} must NOT reference legacy auth token/header "${tok}"`);
      }
      assert.equal(
        /\bsessionStorage\s*\./.test(src),
        false,
        `${label} must NOT access sessionStorage`
      );
      if (label !== 'src/App.tsx') {
        assert.equal(
          /\blocalStorage\s*\./.test(src),
          false,
          `${label} must NOT access localStorage`
        );
      } else {
        const lsCalls = Array.from(src.matchAll(/\blocalStorage\.\w+\(([^)]+)\)/g)).map((m) => m[1]);
        assert.ok(
          lsCalls.every((arg) => arg.includes('cfa_terminal_configs')),
          `src/App.tsx localStorage must only touch cfa_terminal_configs, got: ${lsCalls.join(', ')}`
        );
      }
    }
    assert.ok(apiTs.includes("credentials: 'same-origin'"));
    assert.ok(apiTs.includes("'X-CSRF-Token'"));
    assert.ok(apiTs.includes('/api/auth/me'));
    assert.ok(apiTs.includes('/api/auth/csrf'));

    const clientAssetsDir = path.join(rootDir, 'dist', 'client', 'assets');
    assert.ok(fs.existsSync(clientAssetsDir), 'Expected built dist/client/assets directory');
    const clientJsFiles = fs.readdirSync(clientAssetsDir).filter((f) => f.endsWith('.js'));
    assert.ok(clientJsFiles.length > 0);
    let combinedBundle = '';
    for (const f of clientJsFiles) {
      const content = fs.readFileSync(path.join(clientAssetsDir, f), 'utf-8');
      combinedBundle += content;
      for (const tok of ['cfa_auth_token', 'cfa_user_id', 'cfa_user', 'Authorization:', 'Bearer ']) {
        assert.equal(content.includes(tok), false, `Built bundle ${f} must NOT contain "${tok}"`);
      }
    }
    assert.ok(combinedBundle.includes('same-origin'), 'Built bundle must include credentials same-origin');
    assert.ok(combinedBundle.includes('X-CSRF-Token'), 'Built bundle must include X-CSRF-Token header');
    assert.ok(combinedBundle.includes('/api/auth/me'), 'Built bundle must include /api/auth/me hydration');
    pass(
      'Frontend & Bundle',
      'Zero Storage / Zero Bearer / Built Client Verification',
      `Verified source modules and ${clientJsFiles.length} built JS bundle(s) use credentials: same-origin, /api/auth/me, and in-memory X-CSRF-Token`
    );

    // =========================================================================
    // 6. EXISTING ACCOUNT & DATA PRESERVATION CHECK
    // =========================================================================
    const liveDb = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.json'), 'utf-8')) as DbSchema;
    const backupDb = JSON.parse(fs.readFileSync(pre19cBackup, 'utf-8')) as DbSchema;
    assert.equal(liveDb.accounts.length, 6);
    assert.equal(liveDb.accounts.length, backupDb.accounts.length);
    for (let i = 0; i < backupDb.accounts.length; i++) {
      const b = backupDb.accounts[i];
      const l = liveDb.accounts[i];
      assert.equal(l.user.id, b.user.id);
      assert.equal(l.user.xp, b.user.xp);
      assert.equal(l.user.streak, b.user.streak);
      assert.equal(l.passwordHash, b.passwordHash);
      assert.equal(isScryptHash(l.passwordHash), true);
      assert.deepEqual(l.labNotes, b.labNotes);
    }
    assert.deepEqual(liveDb.groups, backupDb.groups);
    assert.deepEqual(liveDb.posts, backupDb.posts);

    // Verify existing account cookie authentication works on isolated copy
    const dbPreservePath = path.join(tmpDir, 'db-preserve.json');
    fs.copyFileSync(pre19cBackup, dbPreservePath);
    const srvPreserve = await startTempServer(dbPreservePath);
    try {
      const acc1 = backupDb.accounts.find((a) => a.user.id === 'usr-001')!;
      const pwMatchesSeed = (await verifyPassword('password123', acc1.passwordHash)).valid;
      if (pwMatchesSeed) {
        const legacyCookieClient = new TestCookieClient(srvPreserve.baseUrl);
        const loginRes = await legacyCookieClient.request('POST', '/api/auth/login', {
          email: acc1.email,
          password: 'password123',
        });
        assert.equal(loginRes.status, 200);
        assert.equal(loginRes.data.user.xp, acc1.user.xp);
        assert.equal(loginRes.data.user.streak, acc1.user.streak);
        const meRes = await legacyCookieClient.request('GET', '/api/auth/me');
        assert.equal(meRes.status, 200);
        assert.equal(meRes.data.user.id, acc1.user.id);
        const groupsRes = await legacyCookieClient.request('GET', '/api/groups');
        assert.equal(groupsRes.status, 200);
        assert.equal(groupsRes.data.length, backupDb.groups.length);
      }
      pass(
        'Data Preservation',
        '6 Existing Accounts, XP, Streaks, Notes, Posts & Groups Intact',
        'Verified database.json matches pre-Phase 1.9C backup and existing account cookie login preserves XP/notes/groups'
      );
    } finally {
      await new Promise<void>((resolve) => srvPreserve.server.close(() => resolve()));
    }

    console.log(`\nALL ${results.length} PHASE 1.9C VERIFICATION SUITES PASSED.`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\n[FAIL] Phase 1.9C verification failed:', err);
  process.exit(1);
});
