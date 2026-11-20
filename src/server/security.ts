import path from 'path';
import { Request, Response } from 'express';
import { CommunityPost, PersistedCommunityPost } from '../types';

export const TRUSTED_AI_STUDIO_FRAME_ANCESTORS = [
  "'self'",
  'https://*.google.com',
  'https://localhost.corp.google.com:26001',
] as const;

export interface FramingPolicy {
  mode: 'standalone' | 'trusted-preview' | 'custom';
  frameAncestors: string;
  xFrameOptions?: 'SAMEORIGIN' | 'DENY';
}

export interface SecurityHeadersOptions {
  isProduction: boolean;
  isHttps: boolean;
  framingPolicy?: FramingPolicy;
}

export function validateFrameAncestors(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Invalid CSP_FRAME_ANCESTORS configuration: value must be a non-empty string.');
  }
  const trimmed = raw.trim();
  if (/[\x00-\x1f\x7f;]/.test(trimmed)) {
    throw new Error('Invalid CSP_FRAME_ANCESTORS configuration: disallowed control characters or semicolon.');
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error('Invalid CSP_FRAME_ANCESTORS configuration: at least one source token is required.');
  }

  const normalized: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === "'self'" || lower === "'none'") {
      normalized.push(lower);
      continue;
    }

    if (token === '*' || !lower.startsWith('https://')) {
      throw new Error(
        `Invalid CSP_FRAME_ANCESTORS source "${token}": only 'self', 'none', or explicit https:// origins are permitted.`
      );
    }

    const hostPortMatch = /^https:\/\/((?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d{1,5}))?$/i.exec(
      token
    );
    if (!hostPortMatch) {
      throw new Error(`Invalid CSP_FRAME_ANCESTORS origin syntax: "${token}".`);
    }

    const host = hostPortMatch[1].toLowerCase();
    const portStr = hostPortMatch[2];
    if (host.startsWith('*.')) {
      const bareHost = host.slice(2);
      // Require at least two domain labels (e.g. *.google.com, never *.com or *)
      if (!bareHost.includes('.')) {
        throw new Error(`Invalid CSP_FRAME_ANCESTORS wildcard domain "${token}": overly broad wildcard.`);
      }
    }
    if (portStr !== undefined) {
      const portNum = Number(portStr);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error(`Invalid CSP_FRAME_ANCESTORS port in "${token}".`);
      }
    }

    normalized.push(portStr ? `https://${host}:${portStr}` : `https://${host}`);
  }

  if (normalized.includes("'none'") && normalized.length > 1) {
    throw new Error("Invalid CSP_FRAME_ANCESTORS configuration: 'none' cannot be combined with other sources.");
  }

  return Array.from(new Set(normalized)).join(' ');
}

export function isManagedAiStudioEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const appletId = typeof env.APPLET_ID === 'string' ? env.APPLET_ID.trim() : '';
  const cspHeaderValue = typeof env.CSP_HEADER_VALUE === 'string' ? env.CSP_HEADER_VALUE : '';
  const appUrl = typeof env.APP_URL === 'string' ? env.APP_URL.trim() : '';

  return (
    appletId.length > 0 &&
    cspHeaderValue.includes('https://*.google.com') &&
    /^https:\/\/ais-(?:dev|pre)-[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/i.test(appUrl)
  );
}

export function resolveFramingPolicy(
  options?: {
    trustedPreview?: boolean;
    frameAncestors?: string;
  },
  env: NodeJS.ProcessEnv = process.env
): FramingPolicy {
  let explicitEnvTrustedPreview: boolean | undefined;
  if (typeof env.CFA_TRUSTED_PREVIEW === 'string' && env.CFA_TRUSTED_PREVIEW.trim() !== '') {
    const val = env.CFA_TRUSTED_PREVIEW.trim().toLowerCase();
    if (val === 'true') {
      explicitEnvTrustedPreview = true;
    } else if (val === 'false') {
      explicitEnvTrustedPreview = false;
    } else {
      throw new Error(
        `Invalid CFA_TRUSTED_PREVIEW value "${env.CFA_TRUSTED_PREVIEW}": expected "true" or "false".`
      );
    }
  }

  const rawCustomAncestors =
    options?.frameAncestors !== undefined ? options.frameAncestors : env.CSP_FRAME_ANCESTORS;
  if (typeof rawCustomAncestors === 'string' && rawCustomAncestors.trim() !== '') {
    const validated = validateFrameAncestors(rawCustomAncestors);
    if (validated === "'none'") {
      return { mode: 'standalone', frameAncestors: "'none'", xFrameOptions: 'DENY' };
    }
    if (validated === "'self'") {
      return { mode: 'standalone', frameAncestors: "'self'", xFrameOptions: 'SAMEORIGIN' };
    }
    return { mode: 'custom', frameAncestors: validated };
  }

  const useTrustedPreview =
    options?.trustedPreview !== undefined
      ? options.trustedPreview
      : explicitEnvTrustedPreview !== undefined
      ? explicitEnvTrustedPreview
      : isManagedAiStudioEnvironment(env);

  if (useTrustedPreview) {
    return {
      mode: 'trusted-preview',
      frameAncestors: TRUSTED_AI_STUDIO_FRAME_ANCESTORS.join(' '),
    };
  }

  return {
    mode: 'standalone',
    frameAncestors: "'self'",
    xFrameOptions: 'SAMEORIGIN',
  };
}

export type ExpressTrustProxyValue = boolean | number | string;

export function resolveTrustProxyConfig(
  explicitTrustProxy?: ExpressTrustProxyValue,
  env: NodeJS.ProcessEnv = process.env
): ExpressTrustProxyValue {
  if (explicitTrustProxy !== undefined) {
    return explicitTrustProxy;
  }

  const rawEnv = typeof env.TRUST_PROXY === 'string' ? env.TRUST_PROXY.trim() : '';
  if (rawEnv !== '') {
    const lower = rawEnv.toLowerCase();
    if (lower === 'false' || lower === '0') {
      return false;
    }
    if (lower === 'true' || lower === '1') {
      return 1;
    }
    if (lower === 'loopback' || lower === 'linklocal' || lower === 'uniquelocal') {
      return lower;
    }
    if (/^\d+$/.test(rawEnv)) {
      const hops = Number(rawEnv);
      if (hops >= 1 && hops <= 10) {
        return hops;
      }
    }
    throw new Error(`Invalid TRUST_PROXY configuration "${env.TRUST_PROXY}".`);
  }

  // Only in positively identified managed Google AI Studio containers:
  // trust the local loopback Nginx proxy hop (never unrestricted `trust proxy: true`).
  if (isManagedAiStudioEnvironment(env)) {
    return 'loopback';
  }

  return false;
}

export function isRequestOverVerifiedHttps(
  req: Request,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (req.secure) {
    return true;
  }

  // In managed AI Studio containers, Cloud Run terminates TLS and forwards
  // Host=<APP_URL host> to the local Nginx HTTP proxy, which sets
  // X-Forwarded-Host=$host and overwrites X-Forwarded-Proto=$scheme ("http").
  if (!isManagedAiStudioEnvironment(env)) {
    return false;
  }

  const trustFn = req.app?.get?.('trust proxy fn');
  const remoteAddr = req.socket?.remoteAddress;
  if (typeof trustFn !== 'function' || !remoteAddr || !trustFn(remoteAddr, 0)) {
    return false;
  }

  const appUrlRaw = typeof env.APP_URL === 'string' ? env.APP_URL.trim() : '';
  if (!appUrlRaw) {
    return false;
  }

  try {
    const parsedAppUrl = new URL(appUrlRaw);
    if (parsedAppUrl.protocol !== 'https:') {
      return false;
    }
    const reqHost = (req.hostname || '').trim().toLowerCase();
    return Boolean(reqHost && reqHost === parsedAppUrl.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function resolveServerListenConfig(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): { port: number; host: string; avoidedNginxPortCollision: boolean } {
  let cliPort: string | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' && i + 1 < argv.length) {
      cliPort = argv[++i];
    } else if (arg.startsWith('--port=')) {
      cliPort = arg.slice('--port='.length);
    } else if (arg === '--host' && i + 1 < argv.length) {
      cliHost = argv[++i];
    } else if (arg.startsWith('--host=')) {
      cliHost = arg.slice('--host='.length);
    }
  }

  const parseValidPort = (raw: string, label: string): number => {
    if (!/^\d+$/.test(raw.trim())) {
      throw new Error(`Invalid ${label} "${raw}": must be an integer between 1 and 65535.`);
    }
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      throw new Error(`Invalid ${label} "${raw}": must be between 1 and 65535.`);
    }
    return n;
  };

  let host = (cliHost ?? env.HOST ?? '0.0.0.0').trim();
  if (!host || /\s/.test(host)) {
    throw new Error(`Invalid server host configuration: "${host}".`);
  }

  if (cliPort !== undefined && cliPort.trim() !== '') {
    return { port: parseValidPort(cliPort, '--port'), host, avoidedNginxPortCollision: false };
  }

  const nginxPort = typeof env.NGINX_PORT === 'string' ? env.NGINX_PORT.trim() : '';
  const defaultAppPort =
    typeof env.DEFAULT_APP_PORT === 'string' && env.DEFAULT_APP_PORT.trim() !== ''
      ? parseValidPort(env.DEFAULT_APP_PORT, 'DEFAULT_APP_PORT')
      : 3000;

  if (typeof env.PORT === 'string' && env.PORT.trim() !== '') {
    const envPortNum = parseValidPort(env.PORT, 'PORT');
    // Guard against binding onto the outer AI Studio Nginx port (e.g. 8080) on manual runs
    if (nginxPort && String(envPortNum) === nginxPort && envPortNum !== defaultAppPort) {
      return { port: defaultAppPort, host, avoidedNginxPortCollision: true };
    }
    return { port: envPortNum, host, avoidedNginxPortCollision: false };
  }

  return { port: defaultAppPort, host, avoidedNginxPortCollision: false };
}

export function buildContentSecurityPolicy(options: {
  isProduction: boolean;
  frameAncestors?: string;
}): string {
  const frameAncestors = options.frameAncestors || "'self'";
  const scriptSrc = options.isProduction
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline'";
  const connectSrc = options.isProduction
    ? "connect-src 'self'"
    : "connect-src 'self' ws: wss:";

  return [
    "default-src 'self'",
    scriptSrc,
    // Tailwind/Google Fonts stylesheets + React element style attributes (widths, LandingPage textShadow)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    connectSrc,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

export function applySecurityHeaders(
  _req: Request,
  res: Response,
  options: SecurityHeadersOptions
): void {
  const policy = options.framingPolicy ?? {
    mode: 'standalone' as const,
    frameAncestors: "'self'",
    xFrameOptions: 'SAMEORIGIN' as const,
  };

  res.setHeader(
    'Content-Security-Policy',
    buildContentSecurityPolicy({
      isProduction: options.isProduction,
      frameAncestors: policy.frameAncestors,
    })
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  if (policy.xFrameOptions) {
    res.setHeader('X-Frame-Options', policy.xFrameOptions);
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  if (options.isProduction && options.isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

const SENSITIVE_EXACT_PATHS = new Set([
  '/database.json',
  '/package.json',
  '/package-lock.json',
  '/tsconfig.json',
  '/vite.config.ts',
  '/metadata.json',
  '/server.ts',
  '/server.cjs',
  '/server.js',
  '/src/data/curriculum',
  '/src/data/curriculum.ts',
  '/src/data/curriculumenhancer',
  '/src/data/curriculumenhancer.ts',
  '/src/data/curriculumassessmentenhancer',
  '/src/data/curriculumassessmentenhancer.ts',
  '/src/data/practicallabs.ts',
  '/src/data/capstones',
  '/src/data/capstones.ts',
]);

const SENSITIVE_PREFIXES = [
  '/src/server',
  '/src/data/curriculum',
  '/src/data/practicallabs',
  '/src/data/capstones',
  '/backups',
  '/scripts',
  '/dist',
  '/server',
  '/@fs',
];

function decodePathSafely(rawPath: string): string | null {
  let current = rawPath;
  for (let i = 0; i < 4; i++) {
    if (current.includes('\0') || current.includes('\\')) {
      return null;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) {
      break;
    }
    current = decoded;
  }
  if (current.includes('\0') || current.includes('\\')) {
    return null;
  }
  return current;
}

/**
 * Checks whether an incoming non-API URL path attempts to access sensitive server source,
 * assessment answer modules, databases, dotfiles, source maps, or encoded path traversals.
 * Works uniformly across Vite development middleware and production static/SPA serving.
 */
export function isBlockedAppPath(rawUrlOrPath: string, mode: 'dev' | 'prod'): boolean {
  const pathOnlyRaw = (rawUrlOrPath || '/').split('#')[0].split('?')[0] || '/';
  const decoded = decodePathSafely(pathOnlyRaw);
  if (decoded === null) {
    return true;
  }

  // Block explicit traversal segments in both raw and decoded paths before normalization
  if (
    /(?:^|\/)\.\.(?:\/|$)/.test(pathOnlyRaw) ||
    /(?:^|\/)\.\.(?:\/|$)/.test(decoded)
  ) {
    return true;
  }

  const normalized = path.posix.normalize(decoded.startsWith('/') ? decoded : `/${decoded}`);
  const lower = normalized.toLowerCase();

  // Never serve source maps or backup artifacts
  if (lower.endsWith('.map') || lower.endsWith('.bak') || lower.endsWith('.log')) {
    return true;
  }

  // Block any dotfile or dot-segment (e.g. /.env, /.env.example, /.git) except Vite internal /.vite in dev
  const segments = lower.split('/').filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.startsWith('.')) {
      const isViteDevCache =
        mode === 'dev' && i >= 1 && segments[i - 1] === 'node_modules' && seg === '.vite';
      const isWellKnown = i === 0 && seg === '.well-known';
      if (!isViteDevCache && !isWellKnown) {
        return true;
      }
    }
  }

  if (lower.startsWith('/database') && (lower === '/database' || lower.startsWith('/database.'))) {
    return true;
  }

  if (SENSITIVE_EXACT_PATHS.has(lower)) {
    return true;
  }

  for (const prefix of SENSITIVE_PREFIXES) {
    if (lower === prefix || lower.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  // Block /@id/ imports referencing server or private data modules in dev
  if (
    lower.startsWith('/@id/') &&
    (lower.includes('/src/server') ||
      lower.includes('curriculum') ||
      lower.includes('practicallabs') ||
      lower.includes('capstones'))
  ) {
    return true;
  }

  // Block raw node_modules access outside Vite's dev pre-bundle cache and Vite's dev client runtime
  const isAllowedDevNodeModule =
    mode === 'dev' &&
    (lower.startsWith('/node_modules/.vite/') ||
      lower === '/node_modules/vite/dist/client/env.mjs' ||
      lower === '/node_modules/vite/dist/client/client.mjs');
  if ((lower === '/node_modules' || lower.startsWith('/node_modules/')) && !isAllowedDevNodeModule) {
    return true;
  }

  return false;
}

export function deriveForumRoleFromRank(rank?: string): CommunityPost['authorRole'] {
  const lower = (rank || '').toLowerCase();
  if (lower.includes('instructor') || lower.includes('auditor')) return 'Instructor';
  if (lower.includes('infiltrator')) return 'Infiltrator';
  if (lower.includes('operator')) return 'Operator';
  return 'Cadet';
}

export function sanitizePostForClient(
  post: PersistedCommunityPost,
  viewerUserId?: string
): CommunityPost {
  const userVote =
    viewerUserId && post.votesByUserId ? post.votesByUserId[viewerUserId] ?? null : null;
  return {
    id: post.id,
    title: post.title,
    author: post.author,
    authorRole: post.authorRole,
    content: post.content,
    category: post.category,
    upvotes: post.upvotes,
    userVote,
    createdAt: post.createdAt,
    commentsCount: post.commentsCount,
  };
}
