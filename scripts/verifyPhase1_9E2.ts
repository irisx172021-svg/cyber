import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  buildClearCookieOptions,
  buildSessionCookieOptions,
  resolveAuthCookiePolicy,
} from '../src/server/auth';
import {
  isManagedAiStudioEnvironment,
  resolveTrustProxyConfig,
} from '../src/server/security';
import { parseErrorResponse } from '../src/lib/api';
import { TestCookieClient } from './testHttpClient';
import {
  assertLiveDbUnchanged,
  snapshotFileSha256,
  writeBaselineFixtureCopy,
} from './testFixtures';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_9e2_test_session_secret_material_32ch';

async function startTempServer(
  dbPath: string,
  options?: Parameters<(typeof import('../server'))['createApiApp']>[1]
) {
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

function assertPartitionedPreviewCookie(rawCookie: string, name: string, expectCleared = false) {
  assert.ok(rawCookie.startsWith(`${name}=`), `Expected cookie ${name}, got: ${rawCookie}`);
  assert.match(rawCookie, /\bHttpOnly\b/i, `${name} must be HttpOnly`);
  assert.match(rawCookie, /\bSecure\b/i, `${name} must be Secure`);
  assert.match(rawCookie, /\bSameSite=None\b/i, `${name} must be SameSite=None`);
  assert.match(rawCookie, /\bPartitioned\b/i, `${name} must be Partitioned`);
  assert.match(rawCookie, /\bPath=\/(?:;|$)/i, `${name} must have Path=/`);
  if (expectCleared) {
    assert.match(rawCookie, /Expires=Thu, 01 Jan 1970|Max-Age=0/i, `${name} must be expired when cleared`);
  }
}

function assertLaxNonPartitionedCookie(
  rawCookie: string,
  name: string,
  opts: { expectSecure: boolean }
) {
  assert.ok(rawCookie.startsWith(`${name}=`), `Expected cookie ${name}, got: ${rawCookie}`);
  assert.match(rawCookie, /\bHttpOnly\b/i);
  assert.match(rawCookie, /\bSameSite=Lax\b/i);
  assert.equal(/\bPartitioned\b/i.test(rawCookie), false, `${name} must NOT be Partitioned`);
  assert.equal(/\bSecure\b/i.test(rawCookie), opts.expectSecure, `${name} Secure mismatch: ${rawCookie}`);
  assert.match(rawCookie, /\bPath=\/(?:;|$)/i);
}

async function runTests() {
  const pass = (category: string, name: string, detail: string) => {
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const rootDir = process.cwd();
  const preRunLiveSha = snapshotFileSha256(path.join(rootDir, 'database.json'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19e2-'));

  const prevTrustProxy = process.env.TRUST_PROXY;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevCookieSecure = process.env.COOKIE_SECURE;

  try {
    // =========================================================================
    // 1. UNIT TESTS: TRUST PROXY & COOKIE POLICY RESOLUTION
    // =========================================================================
    const standaloneEnv: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    const aiStudioEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
      APPLET_ID: 'd47b537d-0c66-4cef-bb63-485f75e3c36d',
      CSP_HEADER_VALUE: "frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;",
      APP_URL: 'https://ais-dev-example-123.asia-east1.run.app',
    };

    assert.equal(isManagedAiStudioEnvironment(standaloneEnv), false);
    assert.equal(isManagedAiStudioEnvironment(aiStudioEnv), true);
    assert.equal(resolveTrustProxyConfig(undefined, standaloneEnv), false);
    assert.equal(resolveTrustProxyConfig(undefined, aiStudioEnv), 'loopback');
    assert.equal(resolveTrustProxyConfig(undefined, { ...aiStudioEnv, TRUST_PROXY: '0' }), false);
    assert.equal(resolveTrustProxyConfig(undefined, { ...standaloneEnv, TRUST_PROXY: '1' }), 1);
    assert.throws(() => resolveTrustProxyConfig(undefined, { TRUST_PROXY: 'untrusted-all' }), /Invalid TRUST_PROXY/);

    // Verify Partitioned cookie policy triggers ONLY for verified HTTPS + trusted-preview
    assert.deepEqual(
      resolveAuthCookiePolicy({ reqSecure: true, framingMode: 'trusted-preview' }),
      { secure: true, sameSite: 'none', partitioned: true }
    );
    assert.deepEqual(
      resolveAuthCookiePolicy({ reqSecure: false, framingMode: 'trusted-preview' }),
      { secure: false, sameSite: 'lax', partitioned: false }
    );
    assert.deepEqual(
      resolveAuthCookiePolicy({ reqSecure: true, framingMode: 'standalone' }),
      { secure: true, sameSite: 'lax', partitioned: false }
    );

    const previewOpts = buildSessionCookieOptions({ secure: true, sameSite: 'none', partitioned: true, ttlSeconds: 3600 });
    assert.equal(previewOpts.httpOnly, true);
    assert.equal(previewOpts.secure, true);
    assert.equal(previewOpts.sameSite, 'none');
    assert.equal(previewOpts.partitioned, true);
    const clearOpts = buildClearCookieOptions(true, { sameSite: 'none', partitioned: true });
    assert.equal(clearOpts.httpOnly, true);
    assert.equal(clearOpts.secure, true);
    assert.equal(clearOpts.sameSite, 'none');
    assert.equal(clearOpts.partitioned, true);

    pass('UNIT', 'Trusted proxy & cookie policy helpers', 'Verified loopback-only trust proxy in AI Studio env and Partitioned SameSite=None only on verified HTTPS preview');

    // =========================================================================
    // 2. TRUSTED PREVIEW HTTPS PROXY FLOW (REGISTER, REFRESH, LOGOUT, LOGIN)
    // =========================================================================
    const dbPreviewPath = path.join(tmpDir, 'db-preview.json');
    writeBaselineFixtureCopy(dbPreviewPath);

    delete process.env.TRUST_PROXY;
    delete process.env.COOKIE_SECURE;
    process.env.NODE_ENV = 'development';

    const previewSrv = await startTempServer(dbPreviewPath, {
      trustedPreview: true,
      trustProxy: 'loopback',
      rateLimits: {
        registerIpMax: 3,
        registerIpWindowMs: 60_000,
      },
    });

    try {
      const client = new TestCookieClient(previewSrv.baseUrl);

      // 2a. Pre-auth CSRF endpoint via trusted loopback HTTPS proxy
      const csrfRes = await fetch(`${previewSrv.baseUrl}/api/auth/csrf`, {
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '198.51.100.10',
        },
      });
      assert.equal(csrfRes.status, 200);
      client.captureSetCookies(csrfRes.headers);
      const csrfJson = await csrfRes.json();
      client.csrfToken = csrfJson.csrfToken;
      const preSetCookie = getSetCookies(csrfRes.headers).find((c) => c.startsWith('cfa_csrf_pre='));
      assert.ok(preSetCookie, 'Expected cfa_csrf_pre Set-Cookie');
      assertPartitionedPreviewCookie(preSetCookie!, 'cfa_csrf_pre');

      // 2b. Register using partitioned pre-auth CSRF cookie
      const regRes = await client.request(
        'POST',
        '/api/auth/register',
        {
          email: 'preview-chips@test.local',
          username: 'ChipsTester',
          password: 'StrongPassword!2026',
        },
        {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '198.51.100.10',
        }
      );
      assert.equal(regRes.status, 201, `Expected 201 on preview register, got ${regRes.status}: ${regRes.rawText}`);
      const regSetCookies = getSetCookies(regRes.headers);
      const regSessionCookie = regSetCookies.find((c) => c.startsWith('cfa_session='));
      const regClearedPre = regSetCookies.find((c) => c.startsWith('cfa_csrf_pre='));
      assert.ok(regSessionCookie);
      assert.ok(regClearedPre);
      assertPartitionedPreviewCookie(regSessionCookie!, 'cfa_session');
      assertPartitionedPreviewCookie(regClearedPre!, 'cfa_csrf_pre', true);
      assert.equal(regRes.data.user.username, '@ChipsTester');

      // 2c. Refresh / authenticated API requests preserve session
      const meRes = await client.request('GET', '/api/auth/me', undefined, {
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-For': '198.51.100.10',
      });
      assert.equal(meRes.status, 200);
      assert.equal(meRes.data.user.username, '@ChipsTester');

      const groupsRes = await client.request('GET', '/api/groups', undefined, {
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-For': '198.51.100.10',
      });
      assert.equal(groupsRes.status, 200);

      // Keep a copy of the active session cookie to test server-side revocation after logout
      const savedSessionVal = client.cookies.get('cfa_session')!;

      // 2d. Logout clears cookies with matching attributes and revokes session
      const logoutRes = await client.request(
        'POST',
        '/api/auth/logout',
        {},
        {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '198.51.100.10',
        }
      );
      assert.equal(logoutRes.status, 200);
      const logoutCookies = getSetCookies(logoutRes.headers);
      const clearedSession = logoutCookies.find((c) => c.startsWith('cfa_session='));
      const clearedPreOnLogout = logoutCookies.find((c) => c.startsWith('cfa_csrf_pre='));
      assert.ok(clearedSession);
      assert.ok(clearedPreOnLogout);
      assertPartitionedPreviewCookie(clearedSession!, 'cfa_session', true);
      assertPartitionedPreviewCookie(clearedPreOnLogout!, 'cfa_csrf_pre', true);

      const postLogoutMe = await fetch(`${previewSrv.baseUrl}/api/auth/me`, {
        headers: { Cookie: `cfa_session=${savedSessionVal}` },
      });
      assert.equal(postLogoutMe.status, 401, 'Revoked session must be rejected after logout');

      // 2e. Login again in trusted preview HTTPS mode
      const csrfLoginRes = await fetch(`${previewSrv.baseUrl}/api/auth/csrf`, {
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '198.51.100.10',
        },
      });
      client.captureSetCookies(csrfLoginRes.headers);
      client.csrfToken = (await csrfLoginRes.json()).csrfToken;
      const loginPreCookie = getSetCookies(csrfLoginRes.headers).find((c) => c.startsWith('cfa_csrf_pre='));
      assertPartitionedPreviewCookie(loginPreCookie!, 'cfa_csrf_pre');

      const loginRes = await client.request(
        'POST',
        '/api/auth/login',
        {
          email: 'preview-chips@test.local',
          password: 'StrongPassword!2026',
        },
        {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '198.51.100.10',
        }
      );
      assert.equal(loginRes.status, 200);
      const loginSessionCookie = getSetCookies(loginRes.headers).find((c) => c.startsWith('cfa_session='));
      const loginPreClear = getSetCookies(loginRes.headers).find((c) => c.startsWith('cfa_csrf_pre='));
      assertPartitionedPreviewCookie(loginSessionCookie!, 'cfa_session');
      assertPartitionedPreviewCookie(loginPreClear!, 'cfa_csrf_pre', true);

      // Verify distinct client IPs forwarded via trusted loopback proxy get isolated rate-limit buckets
      const ipAClient = new TestCookieClient(previewSrv.baseUrl);
      for (let i = 1; i <= 3; i++) {
        const r = await ipAClient.request(
          'POST',
          '/api/auth/register',
          {
            email: `rate-a-${i}@test.local`,
            username: `RateA_${i}`,
            password: 'StrongPassword!2026',
          },
          { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '198.51.100.77' }
        );
        assert.equal(r.status, 201);
      }
      const rateBlocked = await ipAClient.request(
        'POST',
        '/api/auth/register',
        {
          email: 'rate-a-4@test.local',
          username: 'RateA_4',
          password: 'StrongPassword!2026',
        },
        { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '198.51.100.77' }
      );
      assert.equal(rateBlocked.status, 429);

      // Different forwarded client IP still succeeds
      const ipBClient = new TestCookieClient(previewSrv.baseUrl);
      const ipBReg = await ipBClient.request(
        'POST',
        '/api/auth/register',
        {
          email: 'rate-b-1@test.local',
          username: 'RateB_1',
          password: 'StrongPassword!2026',
        },
        { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '198.51.100.88' }
      );
      assert.equal(ipBReg.status, 201);

      // 2f. Simulate exact platform Nginx forwarding (X-Forwarded-Proto: http + X-Forwarded-Host: <APP_URL host>)
      const prevAppletId = process.env.APPLET_ID;
      const prevCspVal = process.env.CSP_HEADER_VALUE;
      const prevAppUrl = process.env.APP_URL;
      process.env.APPLET_ID = 'd47b537d-0c66-4cef-bb63-485f75e3c36d';
      process.env.CSP_HEADER_VALUE = "frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;";
      process.env.APP_URL = 'https://ais-dev-zgnf7cpwajnrohbpwhqoe7-492355065456.asia-east1.run.app';
      try {
        const nginxCsrf = await fetch(`${previewSrv.baseUrl}/api/auth/csrf`, {
          headers: {
            'X-Forwarded-Proto': 'http',
            'X-Forwarded-Host': 'ais-dev-zgnf7cpwajnrohbpwhqoe7-492355065456.asia-east1.run.app',
            'X-Forwarded-For': '198.51.100.99',
          },
        });
        assert.equal(nginxCsrf.status, 200);
        const nginxPreCookie = getSetCookies(nginxCsrf.headers).find((c) => c.startsWith('cfa_csrf_pre='))!;
        assertPartitionedPreviewCookie(nginxPreCookie, 'cfa_csrf_pre');

        // Plain local HTTP request (X-Forwarded-Host: 127.0.0.1) inside AI Studio must NOT set Secure; Partitioned
        const localHttpCsrf = await fetch(`${previewSrv.baseUrl}/api/auth/csrf`, {
          headers: {
            'X-Forwarded-Proto': 'http',
            'X-Forwarded-Host': '127.0.0.1',
          },
        });
        assert.equal(localHttpCsrf.status, 200);
        const localPreCookie = getSetCookies(localHttpCsrf.headers).find((c) => c.startsWith('cfa_csrf_pre='))!;
        assertLaxNonPartitionedCookie(localPreCookie, 'cfa_csrf_pre', { expectSecure: false });
      } finally {
        if (prevAppletId === undefined) delete process.env.APPLET_ID;
        else process.env.APPLET_ID = prevAppletId;
        if (prevCspVal === undefined) delete process.env.CSP_HEADER_VALUE;
        else process.env.CSP_HEADER_VALUE = prevCspVal;
        if (prevAppUrl === undefined) delete process.env.APP_URL;
        else process.env.APP_URL = prevAppUrl;
      }

      pass('PREVIEW', 'Trusted preview HTTPS cookie & auth lifecycle', 'Verified Partitioned SameSite=None Secure HttpOnly on cfa_csrf_pre/cfa_session/clearCookie, register, refresh, logout revocation, login, Nginx X-Forwarded-Host HTTPS recognition, and proxy IP rate isolation');
    } finally {
      await new Promise<void>((r) => previewSrv.server.close(() => r()));
    }

    // =========================================================================
    // 3. STANDALONE MODE (HTTP & HTTPS) + SPOOFED HEADER IMMUNITY
    // =========================================================================
    const dbStandalonePath = path.join(tmpDir, 'db-standalone.json');
    writeBaselineFixtureCopy(dbStandalonePath);

    // 3a. Standalone with trustProxy: false (spoofed X-Forwarded-* must be ignored)
    const standaloneNoProxy = await startTempServer(dbStandalonePath, {
      trustedPreview: false,
      trustProxy: false,
      rateLimits: { registerIpMax: 2, registerIpWindowMs: 60_000 },
    });
    try {
      const c1 = new TestCookieClient(standaloneNoProxy.baseUrl);
      const reg1 = await c1.request(
        'POST',
        '/api/auth/register',
        {
          email: 'standalone1@test.local',
          username: 'StandaloneOne',
          password: 'StrongPassword!2026',
        },
        {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-For': '203.0.113.1',
          'X-Forwarded-Host': 'ais-dev-spoof.asia-east1.run.app',
        }
      );
      assert.equal(reg1.status, 201);
      const sCookie1 = getSetCookies(reg1.headers).find((c) => c.startsWith('cfa_session='))!;
      assertLaxNonPartitionedCookie(sCookie1, 'cfa_session', { expectSecure: false });

      // Untrusted origin rejected
      const evilRes = await fetch(`${standaloneNoProxy.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: c1.buildCookieHeader(),
          Origin: 'https://evil.example.com',
          'X-CSRF-Token': c1.csrfToken,
        },
        body: JSON.stringify({
          email: 'evil@test.local',
          username: 'EvilUser',
          password: 'StrongPassword!2026',
        }),
      });
      assert.equal(evilRes.status, 403);

      // Missing CSRF rejected
      const noCsrfRes = await fetch(`${standaloneNoProxy.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: standaloneNoProxy.baseUrl,
        },
        body: JSON.stringify({
          email: 'nocsrf@test.local',
          username: 'NoCsrf',
          password: 'StrongPassword!2026',
        }),
      });
      assert.equal(noCsrfRes.status, 403);

      // Spoofed X-Forwarded-For cannot bypass rate limit when trustProxy=false
      const c2 = new TestCookieClient(standaloneNoProxy.baseUrl);
      assert.equal(
        (
          await c2.request(
            'POST',
            '/api/auth/register',
            { email: 'standalone2@test.local', username: 'StandaloneTwo', password: 'StrongPassword!2026' },
            { 'X-Forwarded-For': '203.0.113.2' }
          )
        ).status,
        201
      );
      assert.equal(
        (
          await c2.request(
            'POST',
            '/api/auth/register',
            { email: 'standalone3@test.local', username: 'StandaloneThree', password: 'StrongPassword!2026' },
            { 'X-Forwarded-For': '203.0.113.3' }
          )
        ).status,
        429
      );
    } finally {
      await new Promise<void>((r) => standaloneNoProxy.server.close(() => r()));
    }

    // 3b. Standalone HTTPS proxy (trustProxy: 1 + trustedPreview: false -> Secure + SameSite=Lax, NO Partitioned)
    const standaloneHttps = await startTempServer(dbStandalonePath, {
      trustedPreview: false,
      trustProxy: 1,
    });
    try {
      const cHttps = new TestCookieClient(standaloneHttps.baseUrl);
      const csrfHttps = await fetch(`${standaloneHttps.baseUrl}/api/auth/csrf`, {
        headers: { 'X-Forwarded-Proto': 'https' },
      });
      cHttps.captureSetCookies(csrfHttps.headers);
      cHttps.csrfToken = (await csrfHttps.json()).csrfToken;
      const preHttps = getSetCookies(csrfHttps.headers).find((c) => c.startsWith('cfa_csrf_pre='))!;
      assertLaxNonPartitionedCookie(preHttps, 'cfa_csrf_pre', { expectSecure: true });

      const regHttps = await cHttps.request(
        'POST',
        '/api/auth/register',
        {
          email: 'standalone-https@test.local',
          username: 'StandaloneHttps',
          password: 'StrongPassword!2026',
        },
        { 'X-Forwarded-Proto': 'https' }
      );
      assert.equal(regHttps.status, 201);
      const sessionHttps = getSetCookies(regHttps.headers).find((c) => c.startsWith('cfa_session='))!;
      assertLaxNonPartitionedCookie(sessionHttps, 'cfa_session', { expectSecure: true });

      pass('STANDALONE', 'Strict SameSite=Lax & non-Partitioned behavior', 'Verified SameSite=Lax (no Partitioned), HTTPS Secure flag, spoofed forwarded-header immunity, Origin 403, CSRF 403, and rate limits');
    } finally {
      await new Promise<void>((r) => standaloneHttps.server.close(() => r()));
    }

    // =========================================================================
    // 4. FRONTEND ERROR PARSING (HTML 403 PROXY VS JSON 403 EXPRESS)
    // =========================================================================
    const html403 = new Response(
      '<html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
    const parsedHtml = await parseErrorResponse(html403, 'Registration failed');
    assert.ok(parsedHtml.message.includes('Registration failed'));
    assert.ok(parsedHtml.message.includes('HTTP 403'));
    assert.equal(parsedHtml.message.includes('<html>'), false, 'Must never expose raw HTML');
    assert.equal(parsedHtml.payload, undefined);

    const json403 = new Response(
      JSON.stringify({ error: 'Invalid or missing CSRF verification token for registration.' }),
      { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
    const parsedJson = await parseErrorResponse(json403, 'Registration failed');
    assert.equal(parsedJson.message, 'Invalid or missing CSRF verification token for registration.');
    assert.equal(parsedJson.payload?.error, 'Invalid or missing CSRF verification token for registration.');

    const malformed502 = new Response('<html>502 Bad Gateway', {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
    const parsedMalformed = await parseErrorResponse(malformed502, 'Registration failed');
    assert.ok(parsedMalformed.message.includes('HTTP 502'));

    pass('ERROR_HANDLING', 'HTML 403 proxy vs JSON 403 Express parsing', 'Both HTML 403 and JSON 403 handled cleanly without uncaught JSON parse exceptions or raw HTML leakage');
  } finally {
    if (prevTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prevTrustProxy;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevCookieSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = prevCookieSecure;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  assertLiveDbUnchanged(preRunLiveSha, rootDir);
  console.log('\nALL PHASE 1.9E.2 VERIFICATION CHECKS PASSED!');
}

runTests().catch((err) => {
  console.error('Phase 1.9E.2 verification failed:', err);
  process.exit(1);
});
