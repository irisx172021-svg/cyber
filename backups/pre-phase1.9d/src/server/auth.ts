import crypto from 'crypto';
import { PublicDirectoryUser, User } from '../types';

export const SESSION_TOKEN_PREFIX = 'cfa1';
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const SCRYPT_KEYLEN = 64;
export const SCRYPT_PARAMS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
};

export const MIN_SESSION_SECRET_LENGTH = 32;

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'replace_with_a_long_random_server_secret',
  'your_session_secret_here',
  'change_me',
  'changeme',
  'secret',
  'dev_secret',
  'default_secret',
  'test_secret',
  'auth_session_secret',
]);

// Ephemeral fallback secret generated once per server process ONLY for non-production local runs.
// Never exposed to client code or logged.
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
let devFallbackWarningPrinted = false;

export function validateSessionSecretStrength(
  candidate: unknown
): { valid: true; secret: string } | { valid: false; reason: string } {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    return { valid: false, reason: 'AUTH_SESSION_SECRET is missing or empty.' };
  }
  const trimmed = candidate.trim();
  if (trimmed.length < MIN_SESSION_SECRET_LENGTH) {
    return {
      valid: false,
      reason: `AUTH_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long.`,
    };
  }
  const lower = trimmed.toLowerCase();
  if (
    KNOWN_PLACEHOLDER_SECRETS.has(lower) ||
    lower.includes('replace_with') ||
    lower.includes('placeholder') ||
    lower.includes('example_secret')
  ) {
    return {
      valid: false,
      reason: 'AUTH_SESSION_SECRET uses a known placeholder value and cannot be accepted.',
    };
  }
  // Reject trivial single-character or ultra-low-variety secrets
  if (new Set(trimmed).size < 6) {
    return {
      valid: false,
      reason: 'AUTH_SESSION_SECRET has insufficient character entropy.',
    };
  }
  return { valid: true, secret: trimmed };
}

export function resolveSessionSecret(overrideSecret?: string): string {
  const isProduction = process.env.NODE_ENV === 'production';

  if (overrideSecret !== undefined) {
    const check = validateSessionSecretStrength(overrideSecret);
    if (check.valid === false) {
      throw new Error(`Invalid AUTH_SESSION_SECRET configuration: ${check.reason}`);
    }
    return check.secret;
  }

  const envSecret = process.env.AUTH_SESSION_SECRET;
  if (envSecret && envSecret.trim()) {
    const check = validateSessionSecretStrength(envSecret);
    if (check.valid === false) {
      throw new Error(`Invalid AUTH_SESSION_SECRET configuration: ${check.reason}`);
    }
    return check.secret;
  }

  if (isProduction) {
    throw new Error(
      'AUTH_SESSION_SECRET is required in production (NODE_ENV=production) and must be at least 32 non-placeholder characters.'
    );
  }

  if (!devFallbackWarningPrinted && process.env.CFA_NO_LISTEN !== '1') {
    devFallbackWarningPrinted = true;
    console.warn(
      '[security] AUTH_SESSION_SECRET is not configured; using ephemeral development-only session key (tokens invalidate on restart).'
    );
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

export const DUMMY_SCRYPT_HASH = hashPasswordSync(crypto.randomBytes(24).toString('hex'));

export function isScryptHash(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^scrypt\$[0-9a-f]{32,}\$[0-9a-f]{128}$/i.test(value)
  );
}

export function isRedactedCredentialMarker(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('[REDACTED');
}

export function hashPasswordSync(password: string): string {
  const saltHex = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, saltHex, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${saltHex}$${derived.toString('hex')}`;
}

export async function hashPassword(password: string): Promise<string> {
  const saltHex = crypto.randomBytes(16).toString('hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, saltHex, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt$${saltHex}$${derived.toString('hex')}`;
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Verifies a password against either:
 * - Modern salted scrypt hash (`scrypt$<saltHex>$<derivedKeyHex>`)
 * - Legacy plaintext credential (constant-time SHA-256 comparison), signaling `needsUpgrade: true`
 * Never accepts redacted backup placeholders.
 */
export async function verifyPassword(
  plaintext: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (typeof plaintext !== 'string' || typeof storedHash !== 'string' || !storedHash) {
    return { valid: false, needsUpgrade: false };
  }

  if (isRedactedCredentialMarker(storedHash)) {
    return { valid: false, needsUpgrade: false };
  }

  if (isScryptHash(storedHash)) {
    const [, saltHex, expectedKeyHex] = storedHash.split('$');
    const expectedBuf = Buffer.from(expectedKeyHex, 'hex');
    const derivedBuf = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(plaintext, saltHex, expectedBuf.length, SCRYPT_PARAMS, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    if (derivedBuf.length !== expectedBuf.length) {
      return { valid: false, needsUpgrade: false };
    }
    const valid = crypto.timingSafeEqual(derivedBuf, expectedBuf);
    return { valid, needsUpgrade: false };
  }

  // Legacy plaintext fallback for accounts pending upgrade
  const valid = timingSafeCompareStrings(plaintext, storedHash);
  return { valid, needsUpgrade: valid };
}

export function validatePasswordPolicy(
  password: unknown,
  context?: { email?: string; username?: string }
): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Passcode must be a string.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Passcode must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Passcode must not exceed 128 characters.' };
  }
  if (!/\S/.test(password)) {
    return { valid: false, error: 'Passcode cannot consist solely of whitespace.' };
  }
  const lowerPwd = password.trim().toLowerCase();
  if (context?.email && lowerPwd === context.email.trim().toLowerCase()) {
    return { valid: false, error: 'Passcode cannot match your email address.' };
  }
  if (context?.username) {
    const cleanUser = context.username.trim().replace(/^@/, '').toLowerCase();
    if (cleanUser && (lowerPwd === cleanUser || lowerPwd === `@${cleanUser}`)) {
      return { valid: false, error: 'Passcode cannot match your operator handle.' };
    }
  }
  return { valid: true };
}

export interface SessionTokenPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
  ver: number;
}

export interface RevokedSessionRecord {
  sid: string;
  exp: number; // unix epoch seconds
}

export function issueSessionToken(
  userId: string,
  options?: {
    secret?: string;
    ttlSeconds?: number;
    nowMs?: number;
    tokenVersion?: number;
  }
): { token: string; payload: SessionTokenPayload } {
  const secret = resolveSessionSecret(options?.secret);
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  const ttl = options?.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const payload: SessionTokenPayload = {
    sub: userId,
    sid: crypto.randomBytes(16).toString('hex'),
    iat: nowSec,
    exp: nowSec + ttl,
    ver: options?.tokenVersion ?? 1,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return {
    token: `${SESSION_TOKEN_PREFIX}.${encodedPayload}.${signature}`,
    payload,
  };
}

export function verifySessionToken(
  token: string,
  options?: {
    secret?: string;
    nowMs?: number;
  }
): { valid: true; payload: SessionTokenPayload } | { valid: false; reason: 'malformed' | 'invalid_signature' | 'expired' } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'malformed' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== SESSION_TOKEN_PREFIX || !parts[1] || !parts[2]) {
    return { valid: false, reason: 'malformed' };
  }

  const [, encodedPayload, providedSig] = parts;
  const secret = resolveSessionSecret(options?.secret);
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let parsed: SessionTokenPayload;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (
    !parsed ||
    typeof parsed.sub !== 'string' ||
    typeof parsed.sid !== 'string' ||
    typeof parsed.exp !== 'number' ||
    typeof parsed.iat !== 'number' ||
    typeof parsed.ver !== 'number'
  ) {
    return { valid: false, reason: 'malformed' };
  }

  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  if (parsed.exp <= nowSec) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload: parsed };
}

export const SESSION_COOKIE_NAME = 'cfa_session';
export const PRE_AUTH_CSRF_COOKIE_NAME = 'cfa_csrf_pre';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const PRE_AUTH_CSRF_TTL_SECONDS = 60 * 60; // 1 hour
export const PRE_AUTH_TOKEN_PREFIX = 'pre1';

export function parseCookieHeader(cookieHeader: unknown): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return parsed;
  }

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex <= 0) continue;
    const rawName = pair.slice(0, eqIndex).trim();
    const rawValue = pair.slice(eqIndex + 1).trim();
    if (!rawName) continue;
    try {
      parsed[rawName] = decodeURIComponent(rawValue);
    } catch {
      parsed[rawName] = rawValue;
    }
  }
  return parsed;
}

export function extractSessionCookie(cookieHeader: unknown): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  const val = cookies[SESSION_COOKIE_NAME];
  return typeof val === 'string' && val.trim() ? val.trim() : null;
}

export function extractPreAuthCsrfCookie(cookieHeader: unknown): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  const val = cookies[PRE_AUTH_CSRF_COOKIE_NAME];
  return typeof val === 'string' && val.trim() ? val.trim() : null;
}

export function resolveCookieSecureFlag(reqSecure: boolean, overrideSecure?: boolean): boolean {
  if (overrideSecure !== undefined) {
    return Boolean(overrideSecure);
  }
  if (process.env.COOKIE_SECURE === 'true') {
    return true;
  }
  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'production' || Boolean(reqSecure);
}

export function buildSessionCookieOptions(options: {
  secure: boolean;
  ttlSeconds?: number;
}) {
  const ttlSec = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: options.secure,
    path: '/',
    maxAge: ttlSec * 1000,
  };
}

export function buildClearCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };
}

interface PreAuthCsrfPayload {
  preSid: string;
  exp: number;
}

export function issuePreAuthCsrfCookieValue(options?: {
  secret?: string;
  ttlSeconds?: number;
  nowMs?: number;
}): { cookieValue: string; preSid: string } {
  const secret = resolveSessionSecret(options?.secret);
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  const ttl = options?.ttlSeconds ?? PRE_AUTH_CSRF_TTL_SECONDS;
  const preSid = crypto.randomBytes(16).toString('hex');
  const payload: PreAuthCsrfPayload = {
    preSid,
    exp: nowSec + ttl,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${PRE_AUTH_TOKEN_PREFIX}:${encodedPayload}`)
    .digest('base64url');
  return {
    cookieValue: `${PRE_AUTH_TOKEN_PREFIX}.${encodedPayload}.${sig}`,
    preSid,
  };
}

export function verifyPreAuthCsrfCookieValue(
  cookieValue: unknown,
  options?: { secret?: string; nowMs?: number }
): { valid: true; preSid: string } | { valid: false } {
  if (typeof cookieValue !== 'string' || !cookieValue.trim()) {
    return { valid: false };
  }
  const parts = cookieValue.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PRE_AUTH_TOKEN_PREFIX || !parts[1] || !parts[2]) {
    return { valid: false };
  }
  const [, encodedPayload, providedSig] = parts;
  const secret = resolveSessionSecret(options?.secret);
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${PRE_AUTH_TOKEN_PREFIX}:${encodedPayload}`)
    .digest('base64url');
  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false };
  }
  let parsed: PreAuthCsrfPayload;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false };
  }
  if (!parsed || typeof parsed.preSid !== 'string' || typeof parsed.exp !== 'number') {
    return { valid: false };
  }
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  if (parsed.exp <= nowSec) {
    return { valid: false };
  }
  return { valid: true, preSid: parsed.preSid };
}

/**
 * Generates an HMAC-SHA256 CSRF token bound to `bindingId` (either `session.sid` or pre-auth `preSid`).
 * Never embeds or exposes `bindingId` or the session token itself.
 */
export function createCsrfToken(
  bindingId: string,
  options?: { secret?: string }
): string {
  const secret = resolveSessionSecret(options?.secret);
  const nonce = crypto.randomBytes(16).toString('hex');
  const mac = crypto
    .createHmac('sha256', secret)
    .update(`csrf:v1:${bindingId}:${nonce}`)
    .digest('base64url');
  return `v1.${nonce}.${mac}`;
}

export function verifyCsrfToken(
  token: unknown,
  bindingId: string,
  options?: { secret?: string }
): boolean {
  if (typeof token !== 'string' || !bindingId) {
    return false;
  }
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^[0-9a-f]{32}$/i.test(parts[1]) || !parts[2]) {
    return false;
  }
  const [, nonce, providedMac] = parts;
  const secret = resolveSessionSecret(options?.secret);
  const expectedMac = crypto
    .createHmac('sha256', secret)
    .update(`csrf:v1:${bindingId}:${nonce}`)
    .digest('base64url');
  const providedBuf = Buffer.from(providedMac, 'utf8');
  const expectedBuf = Buffer.from(expectedMac, 'utf8');
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function normalizeOrigin(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildConfiguredTrustedOrigins(explicitOrigins?: string[]): {
  origins: Set<string>;
  hasExplicitLock: boolean;
} {
  const origins = new Set<string>();
  let hasExplicitLock = false;

  if (Array.isArray(explicitOrigins)) {
    hasExplicitLock = true;
    for (const raw of explicitOrigins) {
      const norm = normalizeOrigin(raw);
      if (norm) origins.add(norm);
    }
  }

  const envList = process.env.TRUSTED_ORIGINS;
  if (typeof envList === 'string' && envList.trim()) {
    hasExplicitLock = true;
    for (const part of envList.split(',')) {
      const norm = normalizeOrigin(part);
      if (norm) origins.add(norm);
    }
  }

  const appUrl = process.env.APP_URL;
  if (typeof appUrl === 'string' && appUrl.trim() && appUrl.trim() !== 'MY_APP_URL') {
    const norm = normalizeOrigin(appUrl);
    if (norm) origins.add(norm);
  }

  return { origins, hasExplicitLock };
}

function isLoopbackHost(hostHeader: string): boolean {
  const lower = hostHeader.toLowerCase();
  return (
    lower === 'localhost' ||
    lower.startsWith('localhost:') ||
    lower === '127.0.0.1' ||
    lower.startsWith('127.0.0.1:') ||
    lower === '[::1]' ||
    lower.startsWith('[::1]:')
  );
}

function isSafeHostHeader(hostHeader: unknown): hostHeader is string {
  if (typeof hostHeader !== 'string') return false;
  const trimmed = hostHeader.trim();
  if (!trimmed || trimmed.length > 255) return false;
  // Reject path, whitespace, userinfo, or comma-injected hosts
  return /^[a-z0-9.-]+(?::\d{1,5})?$|^\[[0-9a-f:]+\](?::\d{1,5})?$/i.test(trimmed);
}

export function validateStateChangingOrigin(
  headers: {
    origin?: unknown;
    referer?: unknown;
    secFetchSite?: unknown;
    host?: unknown;
  },
  reqProtocol: string,
  config: { origins: Set<string>; hasExplicitLock: boolean }
): { allowed: true; origin: string } | { allowed: false; reason: string } {
  const secFetchSite =
    typeof headers.secFetchSite === 'string' ? headers.secFetchSite.trim().toLowerCase() : '';
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return {
      allowed: false,
      reason: `Cross-site request rejected (Sec-Fetch-Site: ${secFetchSite}).`,
    };
  }

  const rawOrigin = typeof headers.origin === 'string' ? headers.origin.trim() : '';
  const rawReferer = typeof headers.referer === 'string' ? headers.referer.trim() : '';

  let candidateOrigin: string | null = null;
  if (rawOrigin) {
    candidateOrigin = normalizeOrigin(rawOrigin);
    if (!candidateOrigin) {
      return { allowed: false, reason: 'Invalid or untrusted Origin header.' };
    }
  } else if (rawReferer) {
    candidateOrigin = normalizeOrigin(rawReferer);
    if (!candidateOrigin) {
      return { allowed: false, reason: 'Invalid or untrusted Referer header.' };
    }
  } else {
    return {
      allowed: false,
      reason: 'Origin or Referer header is required for state-changing requests.',
    };
  }

  if (config.origins.has(candidateOrigin)) {
    return { allowed: true, origin: candidateOrigin };
  }

  if (!config.hasExplicitLock && isSafeHostHeader(headers.host)) {
    const hostVal = headers.host.trim().toLowerCase();
    const sameHostOrigins = new Set<string>();
    sameHostOrigins.add(`https://${hostVal}`);
    if (process.env.NODE_ENV !== 'production' || reqProtocol === 'http' || isLoopbackHost(hostVal)) {
      sameHostOrigins.add(`http://${hostVal}`);
    }
    if (sameHostOrigins.has(candidateOrigin.toLowerCase())) {
      return { allowed: true, origin: candidateOrigin };
    }
  }

  return {
    allowed: false,
    reason: `Untrusted request origin: ${candidateOrigin}`,
  };
}

export function pruneRevokedSessions(
  records: RevokedSessionRecord[] | undefined,
  nowMs = Date.now()
): RevokedSessionRecord[] {
  const nowSec = Math.floor(nowMs / 1000);
  if (!Array.isArray(records)) return [];
  return records.filter(
    (rec) => rec && typeof rec.sid === 'string' && typeof rec.exp === 'number' && rec.exp > nowSec
  );
}

export function toPublicDirectoryUser(user: User): PublicDirectoryUser {
  return {
    username: user.username,
    streak: user.streak,
    xp: user.xp,
    rank: user.rank,
    level: user.level,
    completion: user.completion,
    verifiedTopics: [...(user.verifiedTopics || [])],
    followers: [...(user.followers || [])],
  };
}

export function sanitizeSelfUser(user: User): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    xp: user.xp,
    rank: user.rank,
    level: user.level,
    completion: user.completion,
    verifiedTopics: [...(user.verifiedTopics || [])],
    following: [...(user.following || [])],
    followers: [...(user.followers || [])],
    lastStreakUpdate: user.lastStreakUpdate ?? null,
    lastActiveTimestamp: user.lastActiveTimestamp ?? null,
  };
}
