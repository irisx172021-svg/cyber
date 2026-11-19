import path from 'path';
import { Request, Response } from 'express';
import { CommunityPost, PersistedCommunityPost } from '../types';

export interface SecurityHeadersOptions {
  isProduction: boolean;
  isHttps: boolean;
  frameAncestors?: string;
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
  res.setHeader(
    'Content-Security-Policy',
    buildContentSecurityPolicy({
      isProduction: options.isProduction,
      frameAncestors: options.frameAncestors,
    })
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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
  '/src/data/curriculumenhancer.ts',
  '/src/data/practicallabs.ts',
]);

const SENSITIVE_PREFIXES = [
  '/src/server',
  '/src/data/curriculum',
  '/src/data/practicallabs',
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
  if (lower.startsWith('/@id/') && (lower.includes('/src/server') || lower.includes('curriculum') || lower.includes('practicallabs'))) {
    return true;
  }

  // Block raw node_modules access outside Vite's dev pre-bundle cache
  if ((lower === '/node_modules' || lower.startsWith('/node_modules/')) && !(mode === 'dev' && lower.startsWith('/node_modules/.vite/'))) {
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
