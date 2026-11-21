import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {
  isManagedAiStudioEnvironment,
  resolveFramingPolicy,
  resolveServerListenConfig,
  TRUSTED_AI_STUDIO_FRAME_ANCESTORS,
} from '../src/server/security';
import { TestCookieClient } from './testHttpClient';
import {
  assertLiveDbUnchanged,
  snapshotFileSha256,
  writeBaselineFixtureCopy,
} from './testFixtures';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_9e_test_session_secret_material_32chars';

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

async function rawHttpGet(
  baseUrl: string,
  rawPath: string,
  headers?: Record<string, string>
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const parsed = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: rawPath,
        method: 'GET',
        headers,
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

function assertBaseCspDirectives(csp: string, isProduction: boolean) {
  assert.ok(csp.includes("default-src 'self'"), `CSP missing default-src: ${csp}`);
  if (isProduction) {
    assert.ok(csp.includes("script-src 'self';") || csp.includes("script-src 'self' "), `Prod CSP unexpected script-src: ${csp}`);
    assert.ok(!csp.includes("'unsafe-inline'; style-src") || csp.includes("script-src 'self';"), `Prod script-src must stay strict: ${csp}`);
  } else {
    assert.ok(csp.includes("script-src 'self' 'unsafe-inline'"), `Dev CSP missing expected script-src: ${csp}`);
  }
  assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"), `CSP missing style-src: ${csp}`);
  assert.ok(csp.includes("font-src 'self' https://fonts.gstatic.com"), `CSP missing font-src: ${csp}`);
  assert.ok(csp.includes("img-src 'self' data:"), `CSP missing img-src: ${csp}`);
  assert.ok(csp.includes("object-src 'none'"), `CSP missing object-src: ${csp}`);
  assert.ok(csp.includes("base-uri 'self'"), `CSP missing base-uri: ${csp}`);
  assert.ok(csp.includes("form-action 'self'"), `CSP missing form-action: ${csp}`);
}

async function runTests() {
  const pass = (category: string, name: string, detail: string) => {
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const rootDir = process.cwd();
  const preRunLiveSha = snapshotFileSha256(path.join(rootDir, 'database.json'));
  const expectedPreviewAncestors = TRUSTED_AI_STUDIO_FRAME_ANCESTORS.join(' ');

  // =========================================================================
  // 1. UNIT TESTS: FRAMING POLICY & FAIL-CLOSED CONFIG VALIDATION
  // =========================================================================
  const cleanStandaloneEnv: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
  const cleanPreviewEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    APPLET_ID: 'd47b537d-0c66-4cef-bb63-485f75e3c36d',
    CSP_HEADER_VALUE: "frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;",
    APP_URL: 'https://ais-dev-example-123.asia-east1.run.app',
  };

  assert.equal(isManagedAiStudioEnvironment(cleanStandaloneEnv), false);
  assert.equal(isManagedAiStudioEnvironment(cleanPreviewEnv), true);

  const standalonePolicy = resolveFramingPolicy(undefined, cleanStandaloneEnv);
  assert.equal(standalonePolicy.mode, 'standalone');
  assert.equal(standalonePolicy.frameAncestors, "'self'");
  assert.equal(standalonePolicy.xFrameOptions, 'SAMEORIGIN');

  const autoPreviewPolicy = resolveFramingPolicy(undefined, cleanPreviewEnv);
  assert.equal(autoPreviewPolicy.mode, 'trusted-preview');
  assert.equal(autoPreviewPolicy.frameAncestors, expectedPreviewAncestors);
  assert.equal(autoPreviewPolicy.xFrameOptions, undefined);

  const explicitDisableInAiStudio = resolveFramingPolicy(
    undefined,
    { ...cleanPreviewEnv, CFA_TRUSTED_PREVIEW: 'false' }
  );
  assert.equal(explicitDisableInAiStudio.mode, 'standalone');
  assert.equal(explicitDisableInAiStudio.frameAncestors, "'self'");
  assert.equal(explicitDisableInAiStudio.xFrameOptions, 'SAMEORIGIN');

  const explicitEnableStandalone = resolveFramingPolicy(
    undefined,
    { ...cleanStandaloneEnv, CFA_TRUSTED_PREVIEW: 'true' }
  );
  assert.equal(explicitEnableStandalone.mode, 'trusted-preview');
  assert.equal(explicitEnableStandalone.frameAncestors, expectedPreviewAncestors);
  assert.equal(explicitEnableStandalone.xFrameOptions, undefined);

  // Partial or spoof-incomplete AI Studio env vars must stay standalone
  assert.equal(
    resolveFramingPolicy(undefined, {
      APPLET_ID: 'only-id',
      APP_URL: 'https://evil.example.com',
      CSP_HEADER_VALUE: "frame-ancestors 'self' https://*.google.com;",
    }).mode,
    'standalone'
  );

  // Invalid configuration values must fail closed
  const invalidEnvCases: Array<{ label: string; env: NodeJS.ProcessEnv }> = [
    { label: 'invalid CFA_TRUSTED_PREVIEW', env: { CFA_TRUSTED_PREVIEW: 'maybe' } },
    { label: 'wildcard *', env: { CSP_FRAME_ANCESTORS: '*' } },
    { label: 'https://* wildcard', env: { CSP_FRAME_ANCESTORS: 'https://*' } },
    { label: 'insecure http://', env: { CSP_FRAME_ANCESTORS: 'http://evil.com' } },
    { label: 'overbroad *.com wildcard', env: { CSP_FRAME_ANCESTORS: 'https://*.com' } },
    { label: "combined 'none' 'self'", env: { CSP_FRAME_ANCESTORS: "'none' 'self'" } },
    {
      label: 'semicolon directive injection',
      env: { CSP_FRAME_ANCESTORS: "https://google.com; script-src 'unsafe-eval'" },
    },
  ];

  for (const tc of invalidEnvCases) {
    assert.throws(
      () => resolveFramingPolicy(undefined, tc.env),
      /Invalid (?:CFA_TRUSTED_PREVIEW|CSP_FRAME_ANCESTORS)/,
      `Expected fail-closed throw for ${tc.label}`
    );
  }
  pass('FRAMING', 'Policy resolution & fail-closed config validation', 'Verified trusted preview, standalone override, and 7 invalid config rejections');

  // =========================================================================
  // 2. UNIT TESTS: PORT RESOLUTION & NGINX PORT COLLISION GUARD
  // =========================================================================
  const cliOverride = resolveServerListenConfig(['--port', '3000', '--host', '0.0.0.0'], {
    PORT: '8080',
    NGINX_PORT: '8080',
    DEFAULT_APP_PORT: '3000',
  });
  assert.deepEqual(cliOverride, {
    port: 3000,
    host: '0.0.0.0',
    avoidedNginxPortCollision: false,
  });

  const collisionAvoided = resolveServerListenConfig([], {
    PORT: '8080',
    NGINX_PORT: '8080',
    DEFAULT_APP_PORT: '3000',
  });
  assert.deepEqual(collisionAvoided, {
    port: 3000,
    host: '0.0.0.0',
    avoidedNginxPortCollision: true,
  });

  const standalonePort = resolveServerListenConfig([], {
    PORT: '4000',
  });
  assert.deepEqual(standalonePort, {
    port: 4000,
    host: '0.0.0.0',
    avoidedNginxPortCollision: false,
  });

  assert.throws(() => resolveServerListenConfig(['--port', '0'], {}), /Invalid --port/);
  assert.throws(() => resolveServerListenConfig(['--port', 'abc'], {}), /Invalid --port/);
  assert.throws(() => resolveServerListenConfig(['--port=70000'], {}), /Invalid --port/);
  assert.throws(() => resolveServerListenConfig([], { PORT: '99999' }), /Invalid PORT/);
  pass('PORT', 'Listen config & NGINX_PORT collision guard', 'Verified CLI overrides, 8080->3000 collision guard, standalone PORT=4000, and invalid port rejection');

  // =========================================================================
  // 3. HTTP INTEGRATION: TRUSTED PREVIEW VS STANDALONE HEADERS & SPOOF IMMUNITY
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p19e-http-'));
  const dbPath = path.join(tmpDir, 'database.json');
  writeBaselineFixtureCopy(dbPath);

  const prevNodeEnv = process.env.NODE_ENV;
  const prevDisableHmr = process.env.DISABLE_HMR;
  const prevCfaTrusted = process.env.CFA_TRUSTED_PREVIEW;

  // 3a. Dev mode with trustedPreview: true (Vite middleware + API routes)
  process.env.NODE_ENV = 'development';
  process.env.DISABLE_HMR = 'true';
  delete process.env.CFA_TRUSTED_PREVIEW;

  const devPreviewSrv = await startTempServer(
    dbPath,
    {
      sessionSecret: TEST_SECRET,
      trustedPreview: true,
    },
    true
  );

  try {
    for (const p of ['/', '/api/curriculum', '/api/auth/csrf']) {
      const r = await rawHttpGet(devPreviewSrv.baseUrl, p);
      assert.equal(r.status, 200, `Expected 200 for ${p}`);
      assert.equal(r.headers['x-frame-options'], undefined, `X-Frame-Options must be omitted in trusted preview (${p})`);
      const csp = String(r.headers['content-security-policy'] || '');
      assertBaseCspDirectives(csp, false);
      assert.ok(
        csp.includes(`frame-ancestors ${expectedPreviewAncestors}`),
        `Expected trusted preview frame-ancestors on ${p}, got: ${csp}`
      );
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
    }
    const viteEnvDev = await rawHttpGet(devPreviewSrv.baseUrl, '/node_modules/vite/dist/client/env.mjs');
    assert.equal(viteEnvDev.status, 200, 'Vite dev client env.mjs must load in dev mode');
    const arbitraryNodeModDev = await rawHttpGet(devPreviewSrv.baseUrl, '/node_modules/express/package.json');
    assert.equal(arbitraryNodeModDev.status, 404, 'Arbitrary node_modules paths must remain blocked in dev mode');
    pass('HTTP', 'Trusted preview dev headers', 'No X-Frame-Options; CSP allows AI Studio origins while preserving strict directives & Vite dev client loads cleanly');
  } finally {
    await new Promise<void>((r) => devPreviewSrv.server.close(() => r()));
    if (devPreviewSrv.viteServer) {
      await devPreviewSrv.viteServer.close();
    }
  }

  // 3b. Production API mode with trustedPreview: true vs standalone (trustedPreview: false)
  process.env.NODE_ENV = 'production';
  const prodPreviewSrv = await startTempServer(dbPath, {
    sessionSecret: TEST_SECRET,
    trustedPreview: true,
    cookieSecure: true,
  });
  const prodStandaloneSrv = await startTempServer(dbPath, {
    sessionSecret: TEST_SECRET,
    trustedPreview: false,
    cookieSecure: true,
  });

  try {
    const previewRes = await rawHttpGet(prodPreviewSrv.baseUrl, '/api/curriculum');
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.headers['x-frame-options'], undefined);
    const prodPreviewCsp = String(previewRes.headers['content-security-policy'] || '');
    assertBaseCspDirectives(prodPreviewCsp, true);
    assert.ok(prodPreviewCsp.includes(`frame-ancestors ${expectedPreviewAncestors}`));

    // Spoofed Host / Referer / X-Forwarded-Host must NOT relax standalone server into preview mode
    const spoofedStandaloneRes = await rawHttpGet(prodStandaloneSrv.baseUrl, '/api/curriculum', {
      Host: 'aistudio.google.com',
      Referer: 'https://aistudio.google.com/apps/drive/test',
      'X-Forwarded-Host': 'ais-dev-fake.asia-east1.run.app',
    });
    assert.equal(spoofedStandaloneRes.status, 200);
    assert.equal(spoofedStandaloneRes.headers['x-frame-options'], 'SAMEORIGIN');
    const standaloneCsp = String(spoofedStandaloneRes.headers['content-security-policy'] || '');
    assertBaseCspDirectives(standaloneCsp, true);
    assert.ok(standaloneCsp.includes("frame-ancestors 'self'"));
    assert.ok(!standaloneCsp.includes('https://*.google.com'));
    assert.ok(!standaloneCsp.includes('evil.example.com'));

    // Reject createApiApp fail-closed on invalid runtime config
    const { createApiApp } = await import('../server');
    assert.throws(
      () =>
        createApiApp(dbPath, {
          sessionSecret: TEST_SECRET,
          frameAncestors: 'http://insecure.example.com',
        }),
      /Invalid CSP_FRAME_ANCESTORS/
    );

    pass('HTTP', 'Production framing & header spoof immunity', 'Standalone stays SAMEORIGIN + frame-ancestors self even under spoofed Host/Referer');
  } finally {
    await new Promise<void>((r) => prodPreviewSrv.server.close(() => r()));
    await new Promise<void>((r) => prodStandaloneSrv.server.close(() => r()));
  }

  // =========================================================================
  // 4. SECURITY REGRESSION UNDER TRUSTED PREVIEW MODE
  // =========================================================================
  process.env.NODE_ENV = 'development';
  const regSrv = await startTempServer(
    dbPath,
    {
      sessionSecret: TEST_SECRET,
      trustedPreview: true,
    },
    true
  );

  try {
    const client = new TestCookieClient(regSrv.baseUrl);
    const reg = await client.request('POST', '/api/auth/register', {
      email: 'p19e-reg@test.local',
      username: 'PreviewTester',
      password: 'ValidPassword!2026',
    });
    assert.equal(reg.status, 201);
    const setCookies = reg.headers.getSetCookie?.() || [];
    const sessionCookie = setCookies.find((c) => c.startsWith('cfa_session=')) || '';
    assert.ok(/;\s*HttpOnly/i.test(sessionCookie), 'Session cookie must stay HttpOnly');
    assert.ok(/;\s*SameSite=Lax/i.test(sessionCookie), 'Session cookie must stay SameSite=Lax');
    assert.equal(reg.data?.token, undefined, 'Session token must not be returned in JSON body');

    // CSRF protection must still reject missing token and spoofed Origin
    const noCsrf = await fetch(`${regSrv.baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: client.buildCookieHeader(),
        Origin: regSrv.baseUrl,
      },
      body: JSON.stringify({ title: 'No CSRF', content: 'Should fail', category: 'General' }),
    });
    assert.equal(noCsrf.status, 403);

    const evilOrigin = await fetch(`${regSrv.baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: client.buildCookieHeader(),
        Origin: 'https://evil.example.com',
        'X-CSRF-Token': client.csrfToken,
      },
      body: JSON.stringify({ title: 'Evil Origin', content: 'Should fail', category: 'General' }),
    });
    assert.equal(evilOrigin.status, 403);

    // Sensitive files and unknown API routes remain blocked
    const dbLeak = await rawHttpGet(regSrv.baseUrl, '/database.json');
    assert.equal(dbLeak.status, 404);
    const assessLeak = await rawHttpGet(regSrv.baseUrl, '/src/server/assessments.ts');
    assert.equal(assessLeak.status, 404);
    const api404 = await client.request('GET', '/api/does-not-exist');
    assert.equal(api404.status, 404);
    assert.equal(typeof api404.data?.error, 'string');

    pass('REGRESSION', 'Auth, CSRF, & sensitive path blocking under trusted preview', 'HttpOnly+SameSite=Lax, CSRF 403, Origin 403, and 404 blocking intact');
  } finally {
    await new Promise<void>((r) => regSrv.server.close(() => r()));
    if (regSrv.viteServer) {
      await regSrv.viteServer.close();
    }
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevDisableHmr === undefined) delete process.env.DISABLE_HMR;
    else process.env.DISABLE_HMR = prevDisableHmr;
    if (prevCfaTrusted === undefined) delete process.env.CFA_TRUSTED_PREVIEW;
    else process.env.CFA_TRUSTED_PREVIEW = prevCfaTrusted;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  assertLiveDbUnchanged(preRunLiveSha, rootDir);
  console.log('\nALL PHASE 1.9E VERIFICATION CHECKS PASSED!');
}

runTests().catch((err) => {
  console.error('Phase 1.9E verification failed:', err);
  process.exit(1);
});
