import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_COMMUNITY_POSTS,
  DEFAULT_LAB_NOTES,
  DEFAULT_TIMELINE_EVENTS,
} from './src/data/initialState';
import {
  User,
  CommunityPost,
  PersistedCommunityPost,
  TimelineEvent,
  UserProgress,
  Group,
  GroupMessage,
  TutorAction,
} from './src/types';
import { getLessonContext, executeGroqTutorRequest } from './src/server/groqTutor';
import { ACADEMY_CURRICULUM } from './src/data/curriculum.ts';
import { CURRENT_PROGRESS_SCHEMA_VERSION } from './src/data/curriculumMetadata.ts';
import {
  DbSchema,
  AccountRecord,
  applyEngagementMutation,
  applyPostCreationXp,
  applySafeProgressSync,
  ensureMigrationBackup,
  migrateDatabaseSchema,
  needsSchemaMigration,
} from './src/server/migration.ts';
import {
  buildClearCookieOptions,
  buildConfiguredTrustedOrigins,
  buildSessionCookieOptions,
  createCsrfToken,
  CSRF_HEADER_NAME,
  DUMMY_SCRYPT_HASH,
  extractPreAuthCsrfCookie,
  extractSessionCookie,
  hashPassword,
  hashPasswordSync,
  issuePreAuthCsrfCookieValue,
  issueSessionToken,
  PRE_AUTH_CSRF_COOKIE_NAME,
  PRE_AUTH_CSRF_TTL_SECONDS,
  pruneRevokedSessions,
  resolveCookieSecureFlag,
  resolveSessionSecret,
  sanitizeSelfUser,
  SESSION_COOKIE_NAME,
  toPublicDirectoryUser,
  validatePasswordPolicy,
  validateStateChangingOrigin,
  verifyCsrfToken,
  verifyPassword,
  verifyPreAuthCsrfCookieValue,
  verifySessionToken,
} from './src/server/auth.ts';
import {
  getPublicCurriculumPayload,
  verifyLogInvestigationTarget,
} from './src/server/assessments.ts';
import {
  createSecurityRateLimiters,
  RateLimitPolicyConfig,
  resolveClientIp,
} from './src/server/rateLimit.ts';
import { SEED_OPERATOR_DIRECTORY } from './src/server/seedData.ts';
import { readExistingDbSafe, saveDbAtomic, withDbLock } from './src/server/persistence.ts';
import {
  addMemberDeduplicated,
  createGroupInvitationRecord,
  createJoinRequestRecord,
  findAccountByHandle,
  isGroupMember,
  isGroupOwner,
  MAX_GROUP_DESCRIPTION_LENGTH,
  MAX_GROUP_MESSAGE_LENGTH,
  MAX_GROUP_NAME_LENGTH,
  normalizeHandle,
  pruneExpiredInvitations,
  sanitizeGroupForUser,
  sanitizeGroupMessage,
} from './src/server/groups.ts';
import {
  applySecurityHeaders,
  deriveForumRoleFromRank,
  isBlockedAppPath,
  resolveFramingPolicy,
  resolveServerListenConfig,
  sanitizePostForClient,
} from './src/server/security.ts';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'database.json');

export interface CreateApiAppOptions {
  sessionSecret?: string;
  sessionTtlSeconds?: number;
  trustProxy?: boolean | number | string;
  trustedOrigins?: string[];
  cookieSecure?: boolean;
  trustedPreview?: boolean;
  frameAncestors?: string;
  rateLimits?: RateLimitPolicyConfig;
}

interface AuthenticatedContext {
  userId: string;
  sid: string;
  exp: number;
}

type AuthenticatedRequest = Request & { auth?: AuthenticatedContext };

// Helper to load DB safely with corrupt-file preservation and idempotent v1->v2 migration
export function loadDb(dbPath = DEFAULT_DB_PATH): DbSchema {
  const existing = readExistingDbSafe(dbPath);
  if (existing.exists) {
    const parsed = existing.data;
    let groupsAdded = false;
    if (!parsed.groups) {
      groupsAdded = true;
      parsed.groups = [
        {
          id: 'grp-general',
          name: 'General Operators',
          description: 'Core discussion channel for all academy cadets and system operator elites.',
          avatar: '🛡️',
          visibility: 'public',
          ownerId: 'usr-001',
          ownerHandle: '@NetRunner_Zero',
          members: ['@NetRunner_Zero', '@Infiltrator_X', '@AuditMaster'],
          invitations: [],
          joinRequests: [],
          messages: [
            {
              id: 'msg-1',
              senderId: 'usr-001',
              senderUsername: '@NetRunner_Zero',
              senderRole: 'System Operator',
              content:
                'Welcome to the CyberFoundations Academy internal feed! Ensure you complete your local terminal verification homework.',
              createdAt: new Date(Date.now() - 36000000).toISOString(),
            },
            {
              id: 'msg-2',
              senderId: 'usr-002',
              senderUsername: '@Infiltrator_X',
              senderRole: 'Infiltrator',
              content: 'Acknowledged. Running local nmap scans on the target range now.',
              createdAt: new Date(Date.now() - 18000000).toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'grp-threat-hunting',
          name: 'Threat Hunting & Forensics',
          description: 'Advanced log analysis, RAM analysis, and malware dissection.',
          avatar: '🔍',
          visibility: 'private',
          ownerId: 'usr-001',
          ownerHandle: '@NetRunner_Zero',
          members: ['@NetRunner_Zero', '@AuditMaster'],
          invitations: [],
          joinRequests: [],
          messages: [
            {
              id: 'msg-3',
              senderId: 'usr-003',
              senderUsername: '@AuditMaster',
              senderRole: 'Auditor',
              content: 'Found some suspicious event logs on Domain Controller 01. Looks like pass-the-hash.',
              createdAt: new Date(Date.now() - 12000000).toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ];
    }

    if (needsSchemaMigration(parsed)) {
      ensureMigrationBackup(dbPath);
      const migrated = migrateDatabaseSchema(parsed, ACADEMY_CURRICULUM);
      saveDb(migrated.db, dbPath);
      return migrated.db;
    }

    if (groupsAdded) {
      saveDb(parsed, dbPath);
    }
    return parsed as DbSchema;
  }

  // Pre-seed default accounts with scrypt-hashed credentials only when DB file does not yet exist
  const seedPasswordHash1 = hashPasswordSync(process.env.SEED_OPERATOR_PASSCODE || 'password123');
  const seedPasswordHashDefault = hashPasswordSync(process.env.SEED_DIRECTORY_PASSCODE || 'cybersecurity');

  const defaultAccounts: AccountRecord[] = SEED_OPERATOR_DIRECTORY.map((dirUser) => {
    const isPrimary = dirUser.id === 'usr-001';
    const completed = [...(dirUser.verifiedTopics || [])];
    return {
      email: dirUser.email,
      passwordHash: isPrimary ? seedPasswordHash1 : seedPasswordHashDefault,
      tokenVersion: 1,
      user: {
        ...dirUser,
        username: dirUser.username.startsWith('@') ? dirUser.username : `@${dirUser.username}`,
        verifiedTopics: completed,
        following: [...(dirUser.following || [])],
        followers: [...(dirUser.followers || [])],
      },
      progress: {
        schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
        completedLessonIds: completed,
        completedExerciseIds: [],
        completedQuizLessonIds: completed,
        completedHomeworkLessonIds: [],
        legacyCompletedLessonIds: [],
        awardedXpEventIds: completed.map((id) => `submit_quiz:${id}`),
        xp: dirUser.xp,
        streak: dirUser.streak,
        lastActiveDate: dirUser.lastActiveDate,
      },
      labNotes: isPrimary ? DEFAULT_LAB_NOTES : [],
    };
  });

  const schema: DbSchema = {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    accounts: defaultAccounts,
    posts: DEFAULT_COMMUNITY_POSTS,
    timelineEvents: DEFAULT_TIMELINE_EVENTS,
    revokedSessions: [],
    groups: [
      {
        id: 'grp-general',
        name: 'General Operators',
        description: 'Core discussion channel for all academy cadets and system operator elites.',
        avatar: '🛡️',
        visibility: 'public',
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@Infiltrator_X', '@AuditMaster'],
        invitations: [],
        joinRequests: [],
        messages: [
          {
            id: 'msg-1',
            senderId: 'usr-001',
            senderUsername: '@NetRunner_Zero',
            senderRole: 'System Operator',
            content:
              'Welcome to the CyberFoundations Academy internal feed! Ensure you complete your local terminal verification homework.',
            createdAt: new Date(Date.now() - 36000000).toISOString(),
          },
          {
            id: 'msg-2',
            senderId: 'usr-002',
            senderUsername: '@Infiltrator_X',
            senderRole: 'Infiltrator',
            content: 'Acknowledged. Running local nmap scans on the target range now.',
            createdAt: new Date(Date.now() - 18000000).toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'grp-threat-hunting',
        name: 'Threat Hunting & Forensics',
        description: 'Advanced log analysis, RAM analysis, and malware dissection.',
        avatar: '🔍',
        visibility: 'private',
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@AuditMaster'],
        invitations: [],
        joinRequests: [],
        messages: [
          {
            id: 'msg-3',
            senderId: 'usr-003',
            senderUsername: '@AuditMaster',
            senderRole: 'Auditor',
            content: 'Found some suspicious event logs on Domain Controller 01. Looks like pass-the-hash.',
            createdAt: new Date(Date.now() - 12000000).toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
  };

  saveDb(schema, dbPath);
  return schema;
}

// Atomic, validated saveDb
export function saveDb(data: DbSchema, dbPath = DEFAULT_DB_PATH) {
  saveDbAtomic(data, dbPath);
}

export function createApiApp(dbPath = DEFAULT_DB_PATH, options?: CreateApiAppOptions) {
  // Fail closed at startup if session secret or CSP framing configuration is invalid
  const resolvedSecret = resolveSessionSecret(options?.sessionSecret);
  const framingPolicy = resolveFramingPolicy({
    trustedPreview: options?.trustedPreview,
    frameAncestors: options?.frameAncestors,
  });

  const app = express();
  app.disable('x-powered-by');
  app.set(
    'trust proxy',
    options?.trustProxy !== undefined
      ? options.trustProxy
      : process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true'
      ? 1
      : false
  );

  // Security headers & CSP applied consistently across API, dev middleware, and production assets
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = resolveCookieSecureFlag(req.secure, options?.cookieSecure);
    applySecurityHeaders(req, res, {
      isProduction,
      isHttps,
      framingPolicy,
    });
    return next();
  });

  // Block sensitive files, server source, assessment modules, encoded traversals, and source maps in BOTH dev and prod
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawPath = (req.originalUrl || req.url || req.path || '/').split('?')[0];
    if (!rawPath.startsWith('/api/') && rawPath !== '/api') {
      const mode = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
      if (isBlockedAppPath(req.path, mode) || isBlockedAppPath(rawPath, mode)) {
        return res.status(404).type('text/plain').send('Not Found');
      }
    }
    return next();
  });

  app.use(express.json({ limit: '1mb' }));

  const rateLimiters = createSecurityRateLimiters(options?.rateLimits);
  const trustedOriginsConfig = buildConfiguredTrustedOrigins(options?.trustedOrigins);

  // Initialize DB (runs safe idempotent schema migration if needed)
  loadDb(dbPath);

  const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  const DISALLOWED_FORM_MIME_TYPES = [
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ];

  // Global CSRF defense layer 1: strict Origin/Referer/Fetch-Metadata & content-type check
  // on all state-changing API requests (including login & registration).
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    const contentType = (req.headers['content-type'] || '').toString().toLowerCase();
    if (
      contentType &&
      DISALLOWED_FORM_MIME_TYPES.some((mime) => contentType.startsWith(mime))
    ) {
      return res.status(415).json({
        error: 'Unsupported content type for API mutation requests. Expected application/json.',
      });
    }

    const originCheck = validateStateChangingOrigin(
      {
        origin: req.headers['origin'],
        referer: req.headers['referer'],
        secFetchSite: req.headers['sec-fetch-site'],
        host: req.headers['host'],
      },
      req.protocol,
      trustedOriginsConfig
    );

    if (originCheck.allowed === false) {
      return res.status(403).json({ error: originCheck.reason });
    }

    return next();
  });

  const authenticateCookieSession = (
    req: Request
  ):
    | { ok: true; auth: AuthenticatedContext; account: AccountRecord }
    | { ok: false; status: number; error: string } => {
    const token = extractSessionCookie(req.headers['cookie']);
    if (!token) {
      return { ok: false, status: 401, error: 'Authentication session required.' };
    }

    const verified = verifySessionToken(token, { secret: resolvedSecret });
    if (verified.valid === false) {
      const msg =
        verified.reason === 'expired'
          ? 'Session has expired. Please sign in again.'
          : 'Invalid authentication session.';
      return { ok: false, status: 401, error: msg };
    }

    let currentDb: DbSchema;
    try {
      currentDb = loadDb(dbPath);
    } catch {
      return { ok: false, status: 500, error: 'Database unavailable.' };
    }

    const activeRevocations = pruneRevokedSessions(currentDb.revokedSessions);
    if (activeRevocations.some((r) => r.sid === verified.payload.sid)) {
      return {
        ok: false,
        status: 401,
        error: 'Session has been invalidated. Please sign in again.',
      };
    }

    const account = currentDb.accounts.find((acc) => acc.user.id === verified.payload.sub);
    if (!account) {
      return { ok: false, status: 401, error: 'Account associated with session not found.' };
    }

    if ((account.tokenVersion ?? 1) !== verified.payload.ver) {
      return { ok: false, status: 401, error: 'Session token version is no longer active.' };
    }

    return {
      ok: true,
      auth: {
        userId: account.user.id,
        sid: verified.payload.sid,
        exp: verified.payload.exp,
      },
      account,
    };
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authRes = authenticateCookieSession(req);
    if (authRes.ok === false) {
      return res.status(authRes.status).json({ error: authRes.error });
    }

    req.auth = authRes.auth;

    // CSRF defense layer 2: require session-bound X-CSRF-Token on every state-changing authenticated request
    if (STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
      const csrfHeader = req.get(CSRF_HEADER_NAME);
      if (!verifyCsrfToken(csrfHeader, authRes.auth.sid, { secret: resolvedSecret })) {
        return res.status(403).json({
          error: 'Invalid or missing CSRF verification token.',
        });
      }
    }

    return next();
  };

  const verifyPreAuthOrActiveCsrf = (req: Request): boolean => {
    const csrfHeader = req.get(CSRF_HEADER_NAME);
    if (!csrfHeader) return false;

    const preCookie = extractPreAuthCsrfCookie(req.headers['cookie']);
    if (preCookie) {
      const verifiedPre = verifyPreAuthCsrfCookieValue(preCookie, { secret: resolvedSecret });
      if (verifiedPre.valid && verifyCsrfToken(csrfHeader, verifiedPre.preSid, { secret: resolvedSecret })) {
        return true;
      }
    }

    // Also allow if caller already has an active session cookie and valid session-bound CSRF token
    const sessionCheck = authenticateCookieSession(req);
    if (sessionCheck.ok) {
      return verifyCsrfToken(csrfHeader, sessionCheck.auth.sid, { secret: resolvedSecret });
    }

    return false;
  };

  // API: Initialize or retrieve CSRF token (safe GET, zero DB/session state changes)
  app.get('/api/auth/csrf', (req, res) => {
    const sessionCheck = authenticateCookieSession(req);
    if (sessionCheck.ok) {
      return res.json({
        csrfToken: createCsrfToken(sessionCheck.auth.sid, { secret: resolvedSecret }),
        authenticated: true,
      });
    }

    const existingPre = extractPreAuthCsrfCookie(req.headers['cookie']);
    const verifiedExistingPre = existingPre
      ? verifyPreAuthCsrfCookieValue(existingPre, { secret: resolvedSecret })
      : { valid: false as const };

    if (verifiedExistingPre.valid) {
      return res.json({
        csrfToken: createCsrfToken(verifiedExistingPre.preSid, { secret: resolvedSecret }),
        authenticated: false,
      });
    }

    const cookieSecure = resolveCookieSecureFlag(req.secure, options?.cookieSecure);
    const issuedPre = issuePreAuthCsrfCookieValue({ secret: resolvedSecret });
    res.cookie(
      PRE_AUTH_CSRF_COOKIE_NAME,
      issuedPre.cookieValue,
      buildSessionCookieOptions({
        secure: cookieSecure,
        ttlSeconds: PRE_AUTH_CSRF_TTL_SECONDS,
      })
    );

    return res.json({
      csrfToken: createCsrfToken(issuedPre.preSid, { secret: resolvedSecret }),
      authenticated: false,
    });
  });

  // API: Register (IP throttled + Origin/CSRF protected + HttpOnly session cookie)
  app.post('/api/auth/register', async (req, res) => {
    try {
      if (!verifyPreAuthOrActiveCsrf(req)) {
        return res.status(403).json({
          error: 'Invalid or missing CSRF verification token for registration.',
        });
      }

      const clientIp = resolveClientIp(req);
      const regLimit = rateLimiters.checkRegisterAllowed(clientIp);
      if (!regLimit.allowed) {
        res.setHeader('Retry-After', String(regLimit.resetInSec));
        return res.status(429).json({
          error: `Too many registration attempts. Please wait ${regLimit.resetInSec}s before trying again.`,
          retryAfterSec: regLimit.resetInSec,
        });
      }

      const { email, password, username } = req.body || {};

      if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof username !== 'string' ||
        !email.trim() ||
        !username.trim()
      ) {
        return res.status(400).json({ error: 'All credentials must be provided.' });
      }

      const trimmedEmail = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      let formattedUsername = username.trim().replace(/\s+/g, '_');
      if (!formattedUsername.startsWith('@')) {
        formattedUsername = '@' + formattedUsername;
      }
      if (formattedUsername.length < 3 || formattedUsername.length > 32) {
        return res
          .status(400)
          .json({ error: 'Operator handle must be between 2 and 31 characters.' });
      }

      const policyCheck = validatePasswordPolicy(password, {
        email: trimmedEmail,
        username: formattedUsername,
      });
      if (!policyCheck.valid) {
        return res.status(400).json({ error: policyCheck.error });
      }

      const hashedPassword = await hashPassword(password);

      const result = await withDbLock(dbPath, () => {
        const currentDb = loadDb(dbPath);

        const emailExists = currentDb.accounts.some(
          (acc) => acc.email.toLowerCase() === trimmedEmail
        );
        const usernameExists = currentDb.accounts.some(
          (acc) => acc.user.username.toLowerCase() === formattedUsername.toLowerCase()
        );

        if (emailExists || usernameExists) {
          return {
            errorStatus: 409,
            error:
              'Registration could not be completed with the provided details. Please verify your inputs or sign in.',
          };
        }

        const newUser: User = {
          id: `usr-${Math.random().toString(36).substring(2, 11)}`,
          username: formattedUsername,
          email: email.trim(),
          streak: 0,
          lastActiveDate: null,
          xp: 0,
          rank: 'Cadet',
          level: 1,
          completion: 0,
          verifiedTopics: [],
          following: [],
          followers: [],
          lastStreakUpdate: null,
          lastActiveTimestamp: null,
        };

        const newProgress: UserProgress = {
          schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          legacyCompletedLessonIds: [],
          awardedXpEventIds: [],
          xp: 0,
          streak: 0,
          lastActiveDate: null,
          lastStreakUpdate: null,
          lastActiveTimestamp: null,
          updatedAt: new Date().toISOString(),
        };

        currentDb.accounts.push({
          email: trimmedEmail,
          passwordHash: hashedPassword,
          tokenVersion: 1,
          user: newUser,
          progress: newProgress,
          labNotes: [],
        });

        saveDb(currentDb, dbPath);

        const issued = issueSessionToken(newUser.id, {
          secret: resolvedSecret,
          ttlSeconds: options?.sessionTtlSeconds,
          tokenVersion: 1,
        });

        return {
          issued,
          expiresAt: issued.payload.exp * 1000,
          user: sanitizeSelfUser(newUser),
          progress: newProgress,
        };
      });

      if ('errorStatus' in result) {
        return res.status(result.errorStatus).json({ error: result.error });
      }

      const cookieSecure = resolveCookieSecureFlag(req.secure, options?.cookieSecure);
      res.cookie(
        SESSION_COOKIE_NAME,
        result.issued.token,
        buildSessionCookieOptions({
          secure: cookieSecure,
          ttlSeconds: options?.sessionTtlSeconds,
        })
      );
      res.clearCookie(PRE_AUTH_CSRF_COOKIE_NAME, buildClearCookieOptions(cookieSecure));

      return res.status(201).json({
        expiresAt: result.expiresAt,
        user: result.user,
        progress: result.progress,
        csrfToken: createCsrfToken(result.issued.payload.sid, { secret: resolvedSecret }),
      });
    } catch {
      return res.status(500).json({ error: 'Registration failed due to a server error.' });
    }
  });

  // API: Login (Origin/CSRF protected + IP & progressive cooldown + constant-time work + HttpOnly session cookie)
  app.post('/api/auth/login', async (req, res) => {
    try {
      if (!verifyPreAuthOrActiveCsrf(req)) {
        return res.status(403).json({
          error: 'Invalid or missing CSRF verification token for login.',
        });
      }

      const { email, password } = req.body || {};

      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).json({ error: 'Please insert both email/username and passcode.' });
      }

      const normalizedInput = email.toLowerCase().trim();
      const clientIp = resolveClientIp(req);
      const loginLimit = rateLimiters.checkLoginAllowed(clientIp, normalizedInput);
      if (!loginLimit.allowed) {
        res.setHeader('Retry-After', String(loginLimit.resetInSec));
        return res.status(429).json({
          error: `Too many authentication attempts. Please wait ${loginLimit.resetInSec}s before trying again.`,
          retryAfterSec: loginLimit.resetInSec,
        });
      }

      const authOutcome = await withDbLock(dbPath, async () => {
        const currentDb = loadDb(dbPath);
        const match = currentDb.accounts.find((acc) => {
          const accEmail = acc.email.toLowerCase().trim();
          const accUser = acc.user.username.toLowerCase().trim();
          return (
            accEmail === normalizedInput ||
            accUser === normalizedInput ||
            accUser === '@' + normalizedInput ||
            '@' + accUser === normalizedInput ||
            accUser.replace('@', '') === normalizedInput
          );
        });

        if (!match) {
          // Constant-work dummy scrypt verification to prevent timing-based user enumeration
          await verifyPassword(password, DUMMY_SCRYPT_HASH);
          return { authenticated: false as const };
        }

        const { valid, needsUpgrade } = await verifyPassword(password, match.passwordHash);
        if (!valid) {
          return { authenticated: false as const };
        }

        if (needsUpgrade) {
          match.passwordHash = await hashPassword(password);
          if (typeof match.tokenVersion !== 'number') {
            match.tokenVersion = 1;
          }
          saveDb(currentDb, dbPath);
        }

        const issued = issueSessionToken(match.user.id, {
          secret: resolvedSecret,
          ttlSeconds: options?.sessionTtlSeconds,
          tokenVersion: match.tokenVersion ?? 1,
        });

        return {
          authenticated: true as const,
          issued,
          expiresAt: issued.payload.exp * 1000,
          user: sanitizeSelfUser(match.user),
          progress: match.progress,
          labNotes: match.labNotes || [],
        };
      });

      if (!authOutcome.authenticated) {
        rateLimiters.recordLoginFailure(clientIp, normalizedInput);
        return res
          .status(401)
          .json({ error: 'ACCESS DENIED: Credentials mismatch in core directory.' });
      }

      rateLimiters.clearLoginFailures(clientIp, normalizedInput);

      const cookieSecure = resolveCookieSecureFlag(req.secure, options?.cookieSecure);
      res.cookie(
        SESSION_COOKIE_NAME,
        authOutcome.issued.token,
        buildSessionCookieOptions({
          secure: cookieSecure,
          ttlSeconds: options?.sessionTtlSeconds,
        })
      );
      res.clearCookie(PRE_AUTH_CSRF_COOKIE_NAME, buildClearCookieOptions(cookieSecure));

      return res.json({
        expiresAt: authOutcome.expiresAt,
        user: authOutcome.user,
        progress: authOutcome.progress,
        labNotes: authOutcome.labNotes,
        csrfToken: createCsrfToken(authOutcome.issued.payload.sid, { secret: resolvedSecret }),
      });
    } catch {
      return res.status(500).json({ error: 'Authentication failed due to a server error.' });
    }
  });

  // API: Logout (revokes active session ID immediately and clears HttpOnly cookie with matching attributes)
  app.post('/api/auth/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const auth = req.auth!;
      await withDbLock(dbPath, () => {
        const currentDb = loadDb(dbPath);
        const active = pruneRevokedSessions(currentDb.revokedSessions);
        if (!active.some((r) => r.sid === auth.sid)) {
          active.push({ sid: auth.sid, exp: auth.exp });
        }
        currentDb.revokedSessions = active;
        saveDb(currentDb, dbPath);
      });

      const cookieSecure = resolveCookieSecureFlag(req.secure, options?.cookieSecure);
      res.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(cookieSecure));
      res.clearCookie(PRE_AUTH_CSRF_COOKIE_NAME, buildClearCookieOptions(cookieSecure));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to revoke session cleanly.' });
    }
  });

  // API: Authenticated current user profile & session-bound CSRF token hydration
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    return res.json({
      user: sanitizeSelfUser(account.user),
      progress: account.progress,
      csrfToken: createCsrfToken(req.auth!.sid, { secret: resolvedSecret }),
    });
  });

  // API: Public Directory Users (never exposes account IDs, emails, or credentials)
  app.get('/api/users', (_req, res) => {
    const currentDb = loadDb(dbPath);
    const publicUsers = currentDb.accounts.map((acc) => toPublicDirectoryUser(acc.user));
    res.json(publicUsers);
  });

  // API: Follow/Unfollow User (validated + rate-limited)
  app.post('/api/users/follow', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { targetUsername } = req.body || {};
    if (!targetUsername || typeof targetUsername !== 'string' || !targetUsername.trim() || targetUsername.trim().length > 40) {
      return res.status(400).json({ error: 'Valid targetUsername (1-40 chars) is required.' });
    }

    const clientIp = resolveClientIp(req);
    const followLimit = rateLimiters.checkFollowAllowed(req.auth!.userId, clientIp);
    if (!followLimit.allowed) {
      res.setHeader('Retry-After', String(followLimit.resetInSec));
      return res.status(429).json({
        error: `Too many follow updates. Please wait ${followLimit.resetInSec}s before trying again.`,
        retryAfterSec: followLimit.resetInSec,
      });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      let cleanTarget = targetUsername.trim();
      if (!cleanTarget.startsWith('@')) {
        cleanTarget = '@' + cleanTarget;
      }

      const targetAccount = currentDb.accounts.find(
        (acc) => acc.user.username.toLowerCase() === cleanTarget.toLowerCase()
      );
      if (!targetAccount) {
        return { errorStatus: 404, error: 'Target user not found.' };
      }
      if (targetAccount.user.id === account.user.id) {
        return { errorStatus: 400, error: 'Cannot follow your own account.' };
      }

      const canonicalTarget = targetAccount.user.username;
      const alreadyFollowing =
        account.user.following.includes(canonicalTarget) ||
        account.user.following.includes(targetUsername);
      const updatedFollowing = alreadyFollowing
        ? account.user.following.filter(
            (u) => u.toLowerCase() !== canonicalTarget.toLowerCase() && u !== targetUsername
          )
        : [...account.user.following, canonicalTarget];

      account.user.following = updatedFollowing;

      if (!targetAccount.user.followers) {
        targetAccount.user.followers = [];
      }
      const myUsername = account.user.username;
      const alreadyFollowedByMe = targetAccount.user.followers.includes(myUsername);
      if (alreadyFollowing) {
        targetAccount.user.followers = targetAccount.user.followers.filter((u) => u !== myUsername);
      } else if (!alreadyFollowedByMe) {
        targetAccount.user.followers.push(myUsername);
      }

      saveDb(currentDb, dbPath);
      return { following: updatedFollowing };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result);
  });

  // API: Sync Progress & User Metrics (strictly server-authoritative; rejects forged XP/streak/completion)
  app.post('/api/user/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const syncResult = applySafeProgressSync(account, req.body || {}, ACADEMY_CURRICULUM);
      if (syncResult.ok === false) {
        return { errorStatus: syncResult.status, error: syncResult.error };
      }

      saveDb(currentDb, dbPath);
      return {
        user: sanitizeSelfUser(account.user),
        progress: account.progress,
        staleOverwritePrevented: syncResult.staleOverwritePrevented,
      };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result);
  });

  // API: Sanitized Curriculum & Practical Labs (zero answer keys or validation regexes)
  app.get('/api/curriculum', (_req, res) => {
    return res.json(getPublicCurriculumPayload());
  });

  // API: Verify Log Investigation Target Server-Side (throttled per-user/IP, never exposes suspiciousEntryId)
  app.post('/api/assessments/verify-log', requireAuth, (req: AuthenticatedRequest, res) => {
    const clientIp = resolveClientIp(req);
    const rateCheck = rateLimiters.checkAssessmentAllowed(req.auth!.userId, clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.resetInSec));
      return res.status(429).json({
        error: `Too many assessment attempts. Please wait ${rateCheck.resetInSec}s before trying again.`,
        retryAfterSec: rateCheck.resetInSec,
      });
    }

    const { lessonId, labId, entryId } = req.body || {};
    if (
      typeof lessonId !== 'string' ||
      !lessonId.trim() ||
      lessonId.length > 128 ||
      typeof labId !== 'string' ||
      !labId.trim() ||
      labId.length > 128 ||
      typeof entryId !== 'string' ||
      !entryId.trim() ||
      entryId.length > 128
    ) {
      return res.status(400).json({ error: 'Valid lessonId, labId, and entryId strings are required.' });
    }

    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const result = verifyLogInvestigationTarget(
      lessonId.trim(),
      labId.trim(),
      entryId.trim(),
      account.progress,
      ACADEMY_CURRICULUM
    );

    if (result.ok === false) {
      return res.status(result.status).json({
        error: result.error,
        ...(result.missingPrerequisites ? { missingPrerequisites: result.missingPrerequisites } : {}),
      });
    }

    return res.json({
      isTarget: result.isTarget,
      message: result.message,
    });
  });

  // API: Server-Authoritative Active Engagement & Activity Verification
  app.post('/api/user/engage', requireAuth, async (req: AuthenticatedRequest, res) => {
    const {
      engagementType,
      lessonId,
      exerciseId,
      selectedOption,
      answers,
      terminalOutput,
      xpEarned,
      xp,
    } = req.body || {};

    if (
      !['open_lesson', 'submit_quiz', 'verify_homework', 'complete_exercise'].includes(
        engagementType
      )
    ) {
      return res.status(400).json({ error: 'Invalid engagement classification' });
    }

    if (typeof lessonId !== 'string' || !lessonId.trim() || lessonId.length > 128) {
      return res.status(400).json({ error: 'Valid lessonId string (1-128 chars) is required.' });
    }

    if (exerciseId !== undefined && (typeof exerciseId !== 'string' || exerciseId.length > 128)) {
      return res.status(400).json({ error: 'Invalid exerciseId format.' });
    }

    // Throttle active assessment submissions per-user and per-IP synchronously before DB lock
    if (engagementType !== 'open_lesson') {
      const clientIp = resolveClientIp(req);
      const assessLimit = rateLimiters.checkAssessmentAllowed(req.auth!.userId, clientIp);
      if (!assessLimit.allowed) {
        res.setHeader('Retry-After', String(assessLimit.resetInSec));
        return res.status(429).json({
          error: `Assessment rate limit exceeded. Please wait ${assessLimit.resetInSec}s before trying again.`,
          retryAfterSec: assessLimit.resetInSec,
        });
      }
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { status: 404, body: { error: 'Account not found' } };
      }

      const outcome = applyEngagementMutation(
        account,
        {
          engagementType,
          lessonId: lessonId.trim(),
          exerciseId: typeof exerciseId === 'string' ? exerciseId.trim() : undefined,
          selectedOption,
          answers,
          terminalOutput,
          xpEarned,
          xp,
        },
        ACADEMY_CURRICULUM
      );

      if (outcome.ok === false) {
        return {
          status: outcome.status,
          body: {
            error: outcome.error,
            ...(outcome.missingPrerequisites
              ? { missingPrerequisites: outcome.missingPrerequisites }
              : {}),
            ...(outcome.scorePercent !== undefined ? { scorePercent: outcome.scorePercent } : {}),
            ...(outcome.requiredPercent !== undefined
              ? { requiredPercent: outcome.requiredPercent }
              : {}),
            ...(outcome.correctCount !== undefined ? { correctCount: outcome.correctCount } : {}),
            ...(outcome.totalQuestions !== undefined
              ? { totalQuestions: outcome.totalQuestions }
              : {}),
            ...(outcome.passed !== undefined ? { passed: outcome.passed } : {}),
            ...(outcome.questionFeedback ? { questionFeedback: outcome.questionFeedback } : {}),
          },
        };
      }

      if (outcome.xpAwarded > 0 && outcome.timelineAction) {
        const newEvent: TimelineEvent = {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          username: account.user.username,
          action: outcome.timelineAction,
          xpReward: outcome.xpAwarded,
          timestamp: new Date().toISOString(),
        };
        currentDb.timelineEvents.unshift(newEvent);
      }

      saveDb(currentDb, dbPath);
      return {
        status: 200,
        body: {
          user: sanitizeSelfUser(account.user),
          progress: account.progress,
          xpAwarded: outcome.xpAwarded,
          newlyCompletedLesson: outcome.newlyCompletedLesson,
          scorePercent: outcome.scorePercent,
          requiredPercent: outcome.requiredPercent,
          correctCount: outcome.correctCount,
          totalQuestions: outcome.totalQuestions,
          passed: outcome.passed,
          ...(outcome.questionFeedback ? { questionFeedback: outcome.questionFeedback } : {}),
          ...(outcome.explanation ? { explanation: outcome.explanation } : {}),
        },
      };
    });

    return res.status(result.status).json(result.body);
  });

  // API: Get Forum Posts (projects per-viewer userVote when authenticated; strips internal votesByUserId)
  app.get('/api/posts', (req, res) => {
    const authCheck = authenticateCookieSession(req);
    const viewerUserId = authCheck.ok ? authCheck.auth.userId : undefined;
    const currentDb = loadDb(dbPath);
    res.json(currentDb.posts.map((p) => sanitizePostForClient(p, viewerUserId)));
  });

  // API: Create Forum Post (throttled + server-derived role + server-verified daily XP cap)
  app.post('/api/posts', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { title, content, category, xp, xpEarned } = req.body || {};

    if (xp !== undefined || xpEarned !== undefined) {
      return res
        .status(400)
        .json({ error: 'Client-submitted XP values are not permitted on post creation.' });
    }

    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
      return res.status(400).json({ error: 'Valid post title (1-200 chars) is required.' });
    }

    if (typeof content !== 'string' || !content.trim() || content.trim().length > 5000) {
      return res.status(400).json({ error: 'Valid post content (1-5000 chars) is required.' });
    }

    const postRateCheck = rateLimiters.checkPostAllowed(req.auth!.userId);
    if (!postRateCheck.allowed) {
      res.setHeader('Retry-After', String(postRateCheck.resetInSec));
      return res.status(429).json({
        error: `Post rate limit reached. Please wait ${postRateCheck.resetInSec}s before publishing another post.`,
        retryAfterSec: postRateCheck.resetInSec,
      });
    }

    const VALID_CATEGORIES = ['General', 'Help', 'Defensive', 'Offensive', 'Certifications'];
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'General';

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'User not found.' };
      }

      const derivedRole = deriveForumRoleFromRank(account.user.rank);

      const newPost: PersistedCommunityPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        author: account.user.username.replace('@', ''),
        authorRole: derivedRole,
        content: content.trim(),
        category: safeCategory,
        upvotes: 1,
        userVote: 'up',
        votesByUserId: { [account.user.id]: 'up' },
        createdAt: new Date().toISOString(),
        commentsCount: 0,
      };

      currentDb.posts.unshift(newPost);

      const xpOutcome = applyPostCreationXp(account, newPost.id, newPost.title);
      if (xpOutcome.timelineEvent) {
        currentDb.timelineEvents.unshift(xpOutcome.timelineEvent);
      }

      saveDb(currentDb, dbPath);
      return {
        ...sanitizePostForClient(newPost, account.user.id),
        xpAwarded: xpOutcome.xpAwarded,
        dailyPostXpCapReached: xpOutcome.dailyCapReached,
        user: sanitizeSelfUser(account.user),
        progress: account.progress,
      };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result);
  });

  // API: Vote Forum Post (server-authoritative per-user vote ledger, rate-limited, serialized)
  app.post('/api/posts/:id/vote', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { voteType } = req.body || {};
    const postId = req.params.id;
    if (typeof postId !== 'string' || !postId.trim() || postId.length > 128) {
      return res.status(400).json({ error: 'Invalid post identifier.' });
    }
    if (voteType !== 'up' && voteType !== 'down' && voteType !== null) {
      return res.status(400).json({ error: 'Invalid voteType.' });
    }

    const clientIp = resolveClientIp(req);
    const voteLimit = rateLimiters.checkVoteAllowed(req.auth!.userId, clientIp);
    if (!voteLimit.allowed) {
      res.setHeader('Retry-After', String(voteLimit.resetInSec));
      return res.status(429).json({
        error: `Voting rate limit exceeded. Please wait ${voteLimit.resetInSec}s before voting again.`,
        retryAfterSec: voteLimit.resetInSec,
      });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const voterAccount = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!voterAccount) {
        return { errorStatus: 404, error: 'Account not found.' };
      }

      const post = currentDb.posts.find((p) => p.id === postId);
      if (!post) {
        return { errorStatus: 404, error: 'Post not found' };
      }

      if (!post.votesByUserId || typeof post.votesByUserId !== 'object') {
        post.votesByUserId = {};
      }

      const oldVote: 'up' | 'down' | null = post.votesByUserId[voterAccount.user.id] ?? null;

      if (oldVote !== voteType) {
        let diff = 0;
        if (oldVote === 'up') diff -= 1;
        if (oldVote === 'down') diff += 1;
        if (voteType === 'up') diff += 1;
        if (voteType === 'down') diff -= 1;

        post.upvotes = post.upvotes + diff;
        if (voteType === null) {
          delete post.votesByUserId[voterAccount.user.id];
        } else {
          post.votesByUserId[voterAccount.user.id] = voteType;
        }
        saveDb(currentDb, dbPath);
      }

      return { post: sanitizePostForClient(post, voterAccount.user.id) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result.post);
  });

  // API: Get Lab Notes
  app.get('/api/labnotes', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account.labNotes || []);
  });

  // API: Save/Update Lab Note
  app.post('/api/labnotes', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { note } = req.body || {};
    if (!note || typeof note !== 'object' || typeof note.id !== 'string') {
      return res.status(400).json({ error: 'Missing valid note payload' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      if (!account.labNotes) {
        account.labNotes = [];
      }

      const index = account.labNotes.findIndex((n) => n.id === note.id);
      if (index !== -1) {
        account.labNotes[index] = note;
      } else {
        account.labNotes.unshift(note);
      }

      saveDb(currentDb, dbPath);
      return { labNotes: account.labNotes };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result.labNotes);
  });

  // API: Delete Lab Note
  app.delete('/api/labnotes/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const noteId = req.params.id;

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      if (account.labNotes) {
        account.labNotes = account.labNotes.filter((n) => n.id !== noteId);
      }

      saveDb(currentDb, dbPath);
      return { success: true };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result);
  });

  // API: Get Timeline Events
  app.get('/api/timeline', (_req, res) => {
    const currentDb = loadDb(dbPath);
    res.json(currentDb.timelineEvents);
  });

  // API: Block client-forged timeline XP telemetry (generated server-side on verified activities)
  app.post('/api/timeline', requireAuth, (_req, res) => {
    return res.status(403).json({
      error: 'Timeline telemetry events are generated exclusively by verified server activities.',
    });
  });

  // API: Get all groups (authentication required; visibility & membership sanitized; zero internal IDs)
  app.get('/api/groups', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const sanitized = (currentDb.groups || []).map((g) => sanitizeGroupForUser(g, account.user));
    return res.json(sanitized);
  });

  // API: Get single group detail (private groups restricted to authorized members)
  app.get('/api/groups/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const group = (currentDb.groups || []).find((g) => g.id === req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Community group not found' });
    }
    if (group.visibility !== 'public' && !isGroupMember(group, account.user)) {
      return res.status(403).json({
        error: 'Private group details are restricted to authorized members.',
      });
    }
    return res.json(sanitizeGroupForUser(group, account.user));
  });

  // API: Get group messages (authorized members only)
  app.get('/api/groups/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const group = (currentDb.groups || []).find((g) => g.id === req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Community group not found' });
    }
    if (!isGroupMember(group, account.user)) {
      return res.status(403).json({
        error: 'Membership is required to retrieve group messages.',
      });
    }
    return res.json((group.messages || []).map(sanitizeGroupMessage));
  });

  // API: Create a new group (rate-limited, length-validated, conservative private default, sanitized response)
  app.post('/api/groups', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { name, description, avatar, visibility } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group Name is required.' });
    }
    const cleanName = name.trim();
    if (cleanName.length > MAX_GROUP_NAME_LENGTH) {
      return res.status(400).json({
        error: `Group name must not exceed ${MAX_GROUP_NAME_LENGTH} characters.`,
      });
    }

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Group description is required.' });
    }
    const cleanDescription = description.trim();
    if (cleanDescription.length > MAX_GROUP_DESCRIPTION_LENGTH) {
      return res.status(400).json({
        error: `Group description must not exceed ${MAX_GROUP_DESCRIPTION_LENGTH} characters.`,
      });
    }

    let safeVisibility: 'public' | 'private' = 'private';
    if (visibility !== undefined) {
      if (visibility !== 'public' && visibility !== 'private') {
        return res.status(400).json({ error: 'Group visibility must be "public" or "private".' });
      }
      safeVisibility = visibility;
    }

    const clientIp = resolveClientIp(req);
    const rateCheck = rateLimiters.checkGroupCreateAllowed(req.auth!.userId, clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.resetInSec));
      return res.status(429).json({
        error: `Group creation rate limit reached. Please wait ${rateCheck.resetInSec}s before creating another squad.`,
        retryAfterSec: rateCheck.resetInSec,
      });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const newGroup: Group = {
        id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        description: cleanDescription,
        avatar: typeof avatar === 'string' && avatar.trim() ? avatar.trim().slice(0, 8) : '👥',
        visibility: safeVisibility,
        ownerId: account.user.id,
        ownerHandle: account.user.username,
        members: [account.user.username],
        invitations: [],
        joinRequests: [],
        messages: [],
        createdAt: new Date().toISOString(),
      };

      if (!currentDb.groups) {
        currentDb.groups = [];
      }

      currentDb.groups.push(newGroup);
      saveDb(currentDb, dbPath);
      return { group: sanitizeGroupForUser(newGroup, account.user) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result.group);
  });

  // API: Join a PUBLIC group directly (private groups strictly forbid self-joining)
  app.post('/api/groups/:id/join', requireAuth, async (req: AuthenticatedRequest, res) => {
    const groupId = req.params.id;
    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }
      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }
      if (isGroupMember(group, account.user)) {
        return { errorStatus: 409, error: 'You are already a member of this group.' };
      }
      if (group.visibility !== 'public') {
        return {
          errorStatus: 403,
          error: 'Private groups cannot be self-joined. Request access or accept an owner invitation.',
        };
      }

      addMemberDeduplicated(group, account.user.username);
      const selfNorm = normalizeHandle(account.user.username);
      group.invitations = pruneExpiredInvitations(group.invitations).filter(
        (inv) => normalizeHandle(inv.username) !== selfNorm
      );
      group.joinRequests = (group.joinRequests || []).filter(
        (r) => normalizeHandle(r.username) !== selfNorm
      );
      saveDb(currentDb, dbPath);
      return { group: sanitizeGroupForUser(group, account.user) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result.group);
  });

  // API: Owner-only group invitation creation
  app.post('/api/groups/:id/invitations', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { username } = req.body || {};
    const groupId = req.params.id;

    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Valid invitee handle is required.' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const requester = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!requester) {
        return { errorStatus: 404, error: 'Account not found' };
      }
      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }
      if (!isGroupOwner(group, requester.user)) {
        return { errorStatus: 403, error: 'Only the group owner can issue invitations.' };
      }

      const targetAcc = findAccountByHandle(currentDb.accounts, username);
      if (!targetAcc) {
        return { errorStatus: 404, error: 'Target operator handle was not found.' };
      }

      const created = createGroupInvitationRecord(group, requester.user, targetAcc);
      if (created.ok === false) {
        return { errorStatus: created.status, error: created.error };
      }

      saveDb(currentDb, dbPath);
      return {
        invitation: created.invitation,
        group: sanitizeGroupForUser(group, requester.user),
      };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result);
  });

  // API: Invited user responds (accept / decline) to an active invitation
  app.post('/api/groups/:id/invitations/respond', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { action } = req.body || {};
    const groupId = req.params.id;

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'Invitation action must be "accept" or "decline".' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }
      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }

      const selfNorm = normalizeHandle(account.user.username);
      const existingInv = (group.invitations || []).find(
        (inv) => normalizeHandle(inv.username) === selfNorm
      );

      if (!existingInv) {
        return { errorStatus: 403, error: 'You do not have an invitation for this group.' };
      }

      const expMs = Date.parse(existingInv.expiresAt);
      const isExpired = !Number.isFinite(expMs) || expMs <= Date.now();
      group.invitations = pruneExpiredInvitations(group.invitations).filter(
        (inv) => normalizeHandle(inv.username) !== selfNorm
      );

      if (isExpired) {
        saveDb(currentDb, dbPath);
        return {
          errorStatus: 410,
          error: 'This invitation has expired. Ask the group owner for a new invitation.',
        };
      }

      if (action === 'accept') {
        addMemberDeduplicated(group, account.user.username);
        group.joinRequests = (group.joinRequests || []).filter(
          (r) => normalizeHandle(r.username) !== selfNorm
        );
      }

      saveDb(currentDb, dbPath);
      return {
        accepted: action === 'accept',
        group: sanitizeGroupForUser(group, account.user),
      };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result);
  });

  // API: Request access to a private group (requires owner approval)
  app.post('/api/groups/:id/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
    const groupId = req.params.id;
    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }
      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }

      const created = createJoinRequestRecord(group, account.user);
      if (created.ok === false) {
        return { errorStatus: created.status, error: created.error };
      }

      saveDb(currentDb, dbPath);
      return { group: sanitizeGroupForUser(group, account.user) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result.group);
  });

  // API: Group owner approves or rejects a pending join request
  app.post('/api/groups/:id/requests/respond', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { username, action } = req.body || {};
    const groupId = req.params.id;

    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Valid requester handle is required.' });
    }
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Request action must be "approve" or "reject".' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const ownerAccount = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!ownerAccount) {
        return { errorStatus: 404, error: 'Account not found' };
      }
      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }
      if (!isGroupOwner(group, ownerAccount.user)) {
        return { errorStatus: 403, error: 'Only the group owner can approve or reject join requests.' };
      }

      const targetNorm = normalizeHandle(username);
      const pending = (group.joinRequests || []).find(
        (r) => normalizeHandle(r.username) === targetNorm
      );
      if (!pending) {
        return { errorStatus: 404, error: 'No matching pending join request was found.' };
      }

      group.joinRequests = (group.joinRequests || []).filter(
        (r) => normalizeHandle(r.username) !== targetNorm
      );

      if (action === 'approve') {
        const targetAcc = findAccountByHandle(currentDb.accounts, username);
        if (!targetAcc) {
          saveDb(currentDb, dbPath);
          return { errorStatus: 404, error: 'Requesting account no longer exists.' };
        }
        addMemberDeduplicated(group, targetAcc.user.username);
        group.invitations = pruneExpiredInvitations(group.invitations).filter(
          (inv) => normalizeHandle(inv.username) !== targetNorm
        );
      }

      saveDb(currentDb, dbPath);
      return { group: sanitizeGroupForUser(group, ownerAccount.user) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result.group);
  });

  // API: Hardened membership endpoint (blocks private self-join & non-owner invitations)
  app.post('/api/groups/:id/members', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { username } = req.body || {};
    const groupId = req.params.id;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username of the contact is required.' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const requester = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!requester) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Community group not found' };
      }

      const targetNorm = normalizeHandle(username);
      const isSelf = targetNorm === normalizeHandle(requester.user.username);
      const owner = isGroupOwner(group, requester.user);

      // Public self-join is allowed; private self-join is strictly forbidden
      if (isSelf) {
        if (group.visibility !== 'public') {
          return {
            errorStatus: 403,
            error: 'Private groups cannot be self-joined. Request access or accept an owner invitation.',
          };
        }
        if (isGroupMember(group, requester.user)) {
          return { errorStatus: 409, error: 'You are already a member of this group.' };
        }
        addMemberDeduplicated(group, requester.user.username);
        saveDb(currentDb, dbPath);
        return { status: 200, body: sanitizeGroupForUser(group, requester.user) };
      }

      // Adding/inviting another user strictly requires owner authorization
      if (!owner) {
        return {
          errorStatus: 403,
          error: 'Only the group owner can invite or add other members.',
        };
      }

      const targetUserAccount = findAccountByHandle(currentDb.accounts, username);
      if (!targetUserAccount) {
        return {
          errorStatus: 404,
          error: 'Target operator handle was not found.',
        };
      }

      // If the user has an active join request on a private group, owner action approves it
      const hasPendingReq = (group.joinRequests || []).some(
        (r) => normalizeHandle(r.username) === targetNorm
      );
      if (hasPendingReq) {
        group.joinRequests = (group.joinRequests || []).filter(
          (r) => normalizeHandle(r.username) !== targetNorm
        );
        addMemberDeduplicated(group, targetUserAccount.user.username);
        group.invitations = pruneExpiredInvitations(group.invitations).filter(
          (inv) => normalizeHandle(inv.username) !== targetNorm
        );
        saveDb(currentDb, dbPath);
        return { status: 200, body: sanitizeGroupForUser(group, requester.user) };
      }

      // Otherwise issue an authorized invitation (requires invitee acceptance)
      const created = createGroupInvitationRecord(group, requester.user, targetUserAccount);
      if (created.ok === false) {
        return { errorStatus: created.status, error: created.error };
      }

      saveDb(currentDb, dbPath);
      return { status: 201, body: sanitizeGroupForUser(group, requester.user) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(result.status).json(result.body);
  });

  // API: Send a message to a group chat (authorized members only, length-validated, rate-limited, sanitized)
  app.post('/api/groups/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { content } = req.body || {};
    const groupId = req.params.id;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message payload cannot be empty.' });
    }
    const cleanContent = content.trim();
    if (cleanContent.length > MAX_GROUP_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message must not exceed ${MAX_GROUP_MESSAGE_LENGTH} characters.`,
      });
    }

    const clientIp = resolveClientIp(req);
    const rateCheck = rateLimiters.checkGroupMessageAllowed(req.auth!.userId, clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.resetInSec));
      return res.status(429).json({
        error: `Message rate limit exceeded. Please wait ${rateCheck.resetInSec}s before sending another message.`,
        retryAfterSec: rateCheck.resetInSec,
      });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const group = (currentDb.groups || []).find((g) => g.id === groupId);
      if (!group) {
        return { errorStatus: 404, error: 'Group not found.' };
      }

      if (!isGroupMember(group, account.user)) {
        return {
          errorStatus: 403,
          error: 'Membership is required to send messages in this group.',
        };
      }

      const newMessage: GroupMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: account.user.id,
        senderUsername: account.user.username,
        senderRole: account.user.rank.split(' ')[0] || 'Cadet',
        content: cleanContent,
        createdAt: new Date().toISOString(),
      };

      group.messages.push(newMessage);
      saveDb(currentDb, dbPath);
      return { message: sanitizeGroupMessage(newMessage) };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result.message);
  });

  // ==========================================
  // AI TUTOR ENDPOINTS (POWERED BY GROQ)
  // ==========================================

  app.get('/api/ai/tutor/status', (_req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    const isConfigured = !!(apiKey && apiKey.trim() !== '' && apiKey !== 'your_groq_api_key_here');
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    res.json({
      configured: isConfigured,
      provider: 'groq',
      model,
    });
  });

  app.post('/api/ai/tutor', requireAuth, async (req: AuthenticatedRequest, res) => {
    const clientIp = resolveClientIp(req);
    const rateCheck = rateLimiters.checkTutorAllowed(req.auth!.userId, clientIp);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.resetInSec));
      return res.status(429).json({
        error: `Rate limit exceeded. Too many AI tutor inquiries. Please wait ${rateCheck.resetInSec}s before sending another request.`,
        retryAfterSec: rateCheck.resetInSec,
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
      return res.status(503).json({
        error:
          'Groq AI Tutor is not configured. Please set GROQ_API_KEY in your server environment variables or .env file.',
        configured: false,
      });
    }

    const { lessonId, exerciseId, action = 'ask_question', message, history } = req.body || {};

    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'Valid lesson identifier (lessonId) is required.' });
    }

    const lessonContext = getLessonContext(lessonId);
    if (!lessonContext) {
      return res.status(404).json({ error: `Lesson "${lessonId}" not found in academy curriculum.` });
    }

    const VALID_ACTIONS: TutorAction[] = [
      'explain_simply',
      'step_by_step',
      'real_world_example',
      'analogy',
      'explain_code',
      'compare_concepts',
      'hint',
      'test_understanding',
      'summarize',
      'ask_question',
      'continue',
    ];

    const safeAction: TutorAction = VALID_ACTIONS.includes(action) ? action : 'ask_question';

    if (safeAction === 'ask_question' && (!message || typeof message !== 'string' || !message.trim())) {
      return res.status(400).json({ error: 'Please enter a question or topic for the AI tutor.' });
    }

    if (message && typeof message === 'string' && message.length > 1000) {
      return res.status(400).json({ error: 'Message payload exceeds maximum length limit of 1000 characters.' });
    }

    let safeHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (Array.isArray(history)) {
      safeHistory = history
        .slice(-10)
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 2500),
        }));
    }

    try {
      const response = await executeGroqTutorRequest({
        lessonContext,
        exerciseId: typeof exerciseId === 'string' ? exerciseId : undefined,
        action: safeAction,
        userMessage: typeof message === 'string' ? message : undefined,
        history: safeHistory,
        clientIp,
      });

      return res.json(response);
    } catch (err: any) {
      if (err.message === 'GROQ_NOT_CONFIGURED') {
        return res.status(503).json({
          error: 'Groq AI Tutor is not configured. Please set GROQ_API_KEY in your server environment.',
          configured: false,
        });
      }

      if (err.message === 'GROQ_EMPTY_RESPONSE') {
        return res.status(502).json({
          error: 'The AI tutor returned an empty response. Please click Retry to try again.',
        });
      }

      if (err.message === 'GROQ_CONTENT_FILTERED') {
        return res.status(422).json({
          error:
            'The response was blocked by safety filters. Please rephrase your question strictly around defensive or educational concepts.',
        });
      }

      const statusCode = err.status || err.statusCode;
      if (statusCode === 401) {
        return res.status(401).json({
          error: 'Authentication failed with Groq API. Please verify the GROQ_API_KEY configured in your server environment.',
        });
      }

      if (statusCode === 429) {
        return res.status(429).json({
          error: 'Groq API rate limit or TPM exceeded. Please wait a moment before sending another request.',
        });
      }

      if (statusCode === 404 || err.code === 'model_not_found' || err.error?.code === 'model_not_found') {
        const configuredModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
        return res.status(404).json({
          error: `Groq model error: The model "${configuredModel}" does not exist or your API key does not have access to it. Check GROQ_MODEL in your environment variables.`,
        });
      }

      if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
        return res.status(504).json({
          error: 'The AI tutor request timed out. Please retry your question.',
        });
      }

      const cleanMessage = err.message
        ? err.message.replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED]')
        : 'Internal provider error';
      return res.status(500).json({
        error: `AI tutor generation error: ${cleanMessage}`,
      });
    }
  });

  app.use('/api', (_req, res) => {
    return res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Sanitized API error handler (handles malformed JSON bodies without exposing stack traces)
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON request payload.' });
    }
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status).json({
      error: status < 500 ? 'Invalid request.' : 'Internal server error.',
    });
  });

  return app;
}

export async function attachFrontendMiddleware(app: express.Express) {
  let viteServer: Awaited<ReturnType<typeof createViteServer>> | undefined;
  if (process.env.NODE_ENV !== 'production') {
    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        ...(process.env.DISABLE_HMR === 'true' ? { hmr: false } : {}),
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const clientDistPath = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(clientDistPath, { dotfiles: 'deny' }));
    app.get('*', (req, res) => {
      const reqPath = req.path.toLowerCase();
      if (
        isBlockedAppPath(req.path, 'prod') ||
        isBlockedAppPath(req.originalUrl, 'prod') ||
        reqPath === '/assets' ||
        reqPath.startsWith('/assets/') ||
        /\.(?:cjs|mjs|js|ts|tsx|map|json|css|env|md|sh|lock|ya?ml|txt|xml|ico|png|svg|jpe?g|webp|woff2?)$/i.test(
          reqPath
        )
      ) {
        return res.status(404).type('text/plain').send('Not Found');
      }
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Final sanitized catch-all error handler (never leaks stack traces)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (req.path.startsWith('/api/') || req.path === '/api') {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Malformed JSON request payload.' });
      }
      return res.status(500).json({ error: 'Internal server error.' });
    }
    return res.status(500).type('text/plain').send('Internal Server Error');
  });

  return viteServer;
}

async function startServer() {
  const { port, host, avoidedNginxPortCollision } = resolveServerListenConfig();
  if (avoidedNginxPortCollision) {
    console.warn(
      `[server] Container PORT matched NGINX_PORT (${process.env.NGINX_PORT}); binding application server safely to port ${port} instead.`
    );
  }
  const activeDbPath = process.env.CFA_DB_PATH
    ? path.resolve(process.env.CFA_DB_PATH)
    : DEFAULT_DB_PATH;
  const app = createApiApp(activeDbPath);
  await attachFrontendMiddleware(app);

  app.listen(port, host, () => {
    console.log(`Server listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
}

if (process.env.CFA_NO_LISTEN !== '1') {
  startServer();
}
