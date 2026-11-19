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
  DUMMY_SCRYPT_HASH,
  extractBearerToken,
  hashPassword,
  hashPasswordSync,
  issueSessionToken,
  pruneRevokedSessions,
  resolveSessionSecret,
  sanitizeSelfUser,
  toPublicDirectoryUser,
  validatePasswordPolicy,
  verifyPassword,
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

const DEFAULT_DB_PATH = path.join(process.cwd(), 'database.json');

export interface CreateApiAppOptions {
  sessionSecret?: string;
  sessionTtlSeconds?: number;
  trustProxy?: boolean | number | string;
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
          ownerId: 'usr-001',
          ownerHandle: '@NetRunner_Zero',
          members: ['@NetRunner_Zero', '@Infiltrator_X', '@AuditMaster'],
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
          ownerId: 'usr-001',
          ownerHandle: '@NetRunner_Zero',
          members: ['@NetRunner_Zero', '@AuditMaster'],
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
    } else {
      parsed.groups.forEach((group: any) => {
        if (!group.ownerHandle) {
          group.ownerHandle = '@NetRunner_Zero';
        }
      });
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
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@Infiltrator_X', '@AuditMaster'],
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
        ownerId: 'usr-001',
        ownerHandle: '@NetRunner_Zero',
        members: ['@NetRunner_Zero', '@AuditMaster'],
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
  // Fail closed at startup if session secret is missing/weak/placeholder in production
  const resolvedSecret = resolveSessionSecret(options?.sessionSecret);

  const app = express();
  app.set(
    'trust proxy',
    options?.trustProxy !== undefined
      ? options.trustProxy
      : process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true'
      ? 1
      : false
  );
  app.use(express.json());

  const rateLimiters = createSecurityRateLimiters(options?.rateLimits);

  // Initialize DB (runs safe idempotent schema migration if needed)
  loadDb(dbPath);

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers['authorization']);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required (Bearer).' });
    }

    const verified = verifySessionToken(token, { secret: resolvedSecret });
    if (verified.valid === false) {
      const msg =
        verified.reason === 'expired'
          ? 'Session has expired. Please sign in again.'
          : 'Invalid authentication session.';
      return res.status(401).json({ error: msg });
    }

    let currentDb: DbSchema;
    try {
      currentDb = loadDb(dbPath);
    } catch {
      return res.status(500).json({ error: 'Database unavailable.' });
    }

    const activeRevocations = pruneRevokedSessions(currentDb.revokedSessions);
    if (activeRevocations.some((r) => r.sid === verified.payload.sid)) {
      return res.status(401).json({ error: 'Session has been invalidated. Please sign in again.' });
    }

    const account = currentDb.accounts.find((acc) => acc.user.id === verified.payload.sub);
    if (!account) {
      return res.status(401).json({ error: 'Account associated with session not found.' });
    }

    if ((account.tokenVersion ?? 1) !== verified.payload.ver) {
      return res.status(401).json({ error: 'Session token version is no longer active.' });
    }

    req.auth = {
      userId: account.user.id,
      sid: verified.payload.sid,
      exp: verified.payload.exp,
    };
    return next();
  };

  // API: Register (IP throttled + generic conflict error to prevent account enumeration)
  app.post('/api/auth/register', async (req, res) => {
    try {
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
          token: issued.token,
          expiresAt: issued.payload.exp * 1000,
          user: sanitizeSelfUser(newUser),
          progress: newProgress,
        };
      });

      if ('errorStatus' in result) {
        return res.status(result.errorStatus).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch {
      return res.status(500).json({ error: 'Registration failed due to a server error.' });
    }
  });

  // API: Login (IP & progressive cooldown rate-limited + constant-time unknown user work + scrypt upgrade)
  app.post('/api/auth/login', async (req, res) => {
    try {
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
          token: issued.token,
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
      return res.json({
        token: authOutcome.token,
        expiresAt: authOutcome.expiresAt,
        user: authOutcome.user,
        progress: authOutcome.progress,
        labNotes: authOutcome.labNotes,
      });
    } catch {
      return res.status(500).json({ error: 'Authentication failed due to a server error.' });
    }
  });

  // API: Logout (invalidates active session token immediately)
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
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to revoke session cleanly.' });
    }
  });

  // API: Authenticated current user profile
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    return res.json({
      user: sanitizeSelfUser(account.user),
      progress: account.progress,
    });
  });

  // API: Public Directory Users (never exposes account IDs, emails, or credentials)
  app.get('/api/users', (_req, res) => {
    const currentDb = loadDb(dbPath);
    const publicUsers = currentDb.accounts.map((acc) => toPublicDirectoryUser(acc.user));
    res.json(publicUsers);
  });

  // API: Follow/Unfollow User
  app.post('/api/users/follow', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { targetUsername } = req.body || {};
    if (!targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({ error: 'Missing targetUsername' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const alreadyFollowing = account.user.following.includes(targetUsername);
      const updatedFollowing = alreadyFollowing
        ? account.user.following.filter((u) => u !== targetUsername)
        : [...account.user.following, targetUsername];

      account.user.following = updatedFollowing;

      let cleanTarget = targetUsername.trim();
      if (!cleanTarget.startsWith('@')) {
        cleanTarget = '@' + cleanTarget;
      }

      const targetAccount = currentDb.accounts.find(
        (acc) => acc.user.username.toLowerCase() === cleanTarget.toLowerCase()
      );

      if (targetAccount) {
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

  // API: Verify Log Investigation Target Server-Side (never exposes suspiciousEntryId to client)
  app.post('/api/assessments/verify-log', requireAuth, (req: AuthenticatedRequest, res) => {
    const { lessonId, labId, entryId } = req.body || {};
    const currentDb = loadDb(dbPath);
    const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const result = verifyLogInvestigationTarget(
      lessonId,
      labId,
      entryId,
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
          lessonId,
          exerciseId,
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
            missingPrerequisites: outcome.missingPrerequisites,
            scorePercent: outcome.scorePercent,
            requiredPercent: outcome.requiredPercent,
            correctCount: outcome.correctCount,
            totalQuestions: outcome.totalQuestions,
            passed: outcome.passed,
            questionFeedback: outcome.questionFeedback,
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
          questionFeedback: outcome.questionFeedback,
          explanation: outcome.explanation,
        },
      };
    });

    return res.status(result.status).json(result.body);
  });

  // API: Get Forum Posts
  app.get('/api/posts', (_req, res) => {
    const currentDb = loadDb(dbPath);
    res.json(currentDb.posts);
  });

  // API: Create Forum Post (throttled + server-verified daily XP cap + server timeline telemetry)
  app.post('/api/posts', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { title, content, category, authorRole, xp, xpEarned } = req.body || {};

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

      const VALID_ROLES = ['Cadet', 'Operator', 'Infiltrator', 'Instructor'];
      const derivedRole =
        VALID_ROLES.includes(authorRole)
          ? authorRole
          : (account.user.rank.split(' ')[1] as any) || 'Cadet';

      const newPost: CommunityPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        author: account.user.username.replace('@', ''),
        authorRole: derivedRole,
        content: content.trim(),
        category: safeCategory,
        upvotes: 1,
        userVote: 'up',
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
        ...newPost,
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

  // API: Vote Forum Post
  app.post('/api/posts/:id/vote', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { voteType } = req.body || {};
    const postId = req.params.id;
    if (voteType !== 'up' && voteType !== 'down' && voteType !== null) {
      return res.status(400).json({ error: 'Invalid voteType.' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const postIndex = currentDb.posts.findIndex((p) => p.id === postId);
      if (postIndex === -1) {
        return { errorStatus: 404, error: 'Post not found' };
      }

      const post = currentDb.posts[postIndex];
      let diff = 0;
      const oldVote = post.userVote;

      if (oldVote === 'up') diff -= 1;
      if (oldVote === 'down') diff += 1;

      if (voteType === 'up') diff += 1;
      if (voteType === 'down') diff -= 1;

      post.upvotes = post.upvotes + diff;
      post.userVote = voteType;

      saveDb(currentDb, dbPath);
      return { post };
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

  // API: Get all groups
  app.get('/api/groups', (_req, res) => {
    const currentDb = loadDb(dbPath);
    res.json(currentDb.groups || []);
  });

  // API: Create a new group
  app.post('/api/groups', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { name, description, avatar } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group Name is required.' });
    }

    const result = await withDbLock(dbPath, () => {
      const currentDb = loadDb(dbPath);
      const account = currentDb.accounts.find((acc) => acc.user.id === req.auth!.userId);
      if (!account) {
        return { errorStatus: 404, error: 'Account not found' };
      }

      const newGroup: Group = {
        id: `grp-${Date.now()}`,
        name: name.trim(),
        description: (typeof description === 'string' ? description : '').trim(),
        avatar: typeof avatar === 'string' && avatar ? avatar : '👥',
        ownerId: account.user.id,
        ownerHandle: account.user.username,
        members: [account.user.username],
        messages: [],
        createdAt: new Date().toISOString(),
      };

      if (!currentDb.groups) {
        currentDb.groups = [];
      }

      currentDb.groups.push(newGroup);
      saveDb(currentDb, dbPath);
      return { group: newGroup };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.status(201).json(result.group);
  });

  // API: Add/Invite a member to a group by username
  app.post('/api/groups/:id/members', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { username } = req.body || {};
    const groupId = req.params.id;

    if (!username || typeof username !== 'string') {
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

      let targetUsername = username.trim();
      if (!targetUsername.startsWith('@')) {
        targetUsername = '@' + targetUsername;
      }

      // Allow self-join or invite by an existing member
      const isSelfJoin = targetUsername.toLowerCase() === requester.user.username.toLowerCase();
      const requesterIsMember = group.members.some(
        (m) => m.toLowerCase() === requester.user.username.toLowerCase()
      );
      if (!isSelfJoin && !requesterIsMember) {
        return { errorStatus: 403, error: 'Only group members can invite other operators.' };
      }

      const targetUserAccount = currentDb.accounts.find(
        (acc) => acc.user.username.toLowerCase() === targetUsername.toLowerCase()
      );

      if (!targetUserAccount) {
        return {
          errorStatus: 404,
          error: `Operator ${targetUsername} does not exist in active directory.`,
        };
      }

      const alreadyMember = group.members.some(
        (m) => m.toLowerCase() === targetUsername.toLowerCase()
      );

      if (alreadyMember) {
        return { errorStatus: 400, error: `${targetUsername} is already a member of this group.` };
      }

      group.members.push(targetUserAccount.user.username);
      saveDb(currentDb, dbPath);
      return { group };
    });

    if ('errorStatus' in result) {
      return res.status(result.errorStatus).json({ error: result.error });
    }
    return res.json(result.group);
  });

  // API: Send a direct message to a group chat
  app.post('/api/groups/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { content } = req.body || {};
    const groupId = req.params.id;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message payload cannot be empty.' });
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

      const isMember = group.members.some(
        (m) => m.toLowerCase() === account.user.username.toLowerCase()
      );

      if (!isMember) {
        return {
          errorStatus: 403,
          error: 'Must join or be a member of the group to dispatch data packets.',
        };
      }

      const newMessage: GroupMessage = {
        id: `msg-${Date.now()}`,
        senderId: account.user.id,
        senderUsername: account.user.username,
        senderRole: account.user.rank.split(' ')[0] || 'Cadet',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      group.messages.push(newMessage);
      saveDb(currentDb, dbPath);
      return { message: newMessage };
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

  return app;
}

async function startServer() {
  const PORT = 3000;
  const app = createApiApp(DEFAULT_DB_PATH);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

if (process.env.CFA_NO_LISTEN !== '1') {
  startServer();
}
