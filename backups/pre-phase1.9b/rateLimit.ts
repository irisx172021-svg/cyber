import { Request } from 'express';

export interface FixedWindowResult {
  allowed: boolean;
  remaining: number;
  resetInSec: number;
}

export interface RateLimitPolicyConfig {
  loginIpMax?: number;
  loginIpWindowMs?: number;
  loginFailureThreshold?: number;
  loginBaseCooldownSec?: number;
  loginMaxCooldownSec?: number;
  registerIpMax?: number;
  registerIpWindowMs?: number;
  postUserMax?: number;
  postUserWindowMs?: number;
  tutorUserMax?: number;
  tutorUserWindowMs?: number;
  tutorIpMax?: number;
  tutorIpWindowMs?: number;
}

interface WindowBucket {
  count: number;
  resetAtMs: number;
}

interface FailureRecord {
  failures: number;
  lockedUntilMs: number;
  lastAttemptMs: number;
}

export function resolveClientIp(req: Request): string {
  // Uses Express `req.ip` (which honors configured `app.set('trust proxy', ...)` safely)
  // and never blindly trusts raw spoofable X-Forwarded-For headers.
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

class SlidingWindowCounter {
  private readonly buckets = new Map<string, WindowBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  private pruneExpired(nowMs: number) {
    if (this.buckets.size < 500) return;
    for (const [k, v] of this.buckets.entries()) {
      if (nowMs >= v.resetAtMs) {
        this.buckets.delete(k);
      }
    }
  }

  checkWithoutConsume(key: string, nowMs = Date.now()): FixedWindowResult {
    const existing = this.buckets.get(key);
    if (!existing || nowMs >= existing.resetAtMs) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetInSec: Math.ceil(this.windowMs / 1000),
      };
    }
    if (existing.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSec: Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000)),
      };
    }
    return {
      allowed: true,
      remaining: this.maxRequests - existing.count,
      resetInSec: Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000)),
    };
  }

  consume(key: string, nowMs = Date.now()): FixedWindowResult {
    this.pruneExpired(nowMs);
    const existing = this.buckets.get(key);
    if (!existing || nowMs >= existing.resetAtMs) {
      this.buckets.set(key, { count: 1, resetAtMs: nowMs + this.windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, this.maxRequests - 1),
        resetInSec: Math.ceil(this.windowMs / 1000),
      };
    }

    if (existing.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSec: Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - existing.count),
      resetInSec: Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000)),
    };
  }
}

class ProgressiveCooldownTracker {
  private readonly records = new Map<string, FailureRecord>();
  private readonly threshold: number;
  private readonly baseCooldownSec: number;
  private readonly maxCooldownSec: number;

  constructor(threshold: number, baseCooldownSec: number, maxCooldownSec: number) {
    this.threshold = threshold;
    this.baseCooldownSec = baseCooldownSec;
    this.maxCooldownSec = maxCooldownSec;
  }

  checkBlocked(key: string, nowMs = Date.now()): { blocked: boolean; retryAfterSec: number } {
    const rec = this.records.get(key);
    if (!rec) return { blocked: false, retryAfterSec: 0 };
    if (rec.lockedUntilMs > nowMs) {
      return {
        blocked: true,
        retryAfterSec: Math.max(1, Math.ceil((rec.lockedUntilMs - nowMs) / 1000)),
      };
    }
    // Stale entry older than 2x maxCooldown can be retired when not blocked
    if (nowMs - rec.lastAttemptMs > this.maxCooldownSec * 2000) {
      this.records.delete(key);
    }
    return { blocked: false, retryAfterSec: 0 };
  }

  recordFailure(key: string, nowMs = Date.now()): { blockedNow: boolean; retryAfterSec: number } {
    const existing = this.records.get(key);
    const failures = (existing ? existing.failures : 0) + 1;
    let lockedUntilMs = 0;
    let retryAfterSec = 0;

    if (failures >= this.threshold) {
      const exponent = Math.min(10, failures - this.threshold);
      retryAfterSec = Math.min(this.maxCooldownSec, this.baseCooldownSec * Math.pow(2, exponent));
      lockedUntilMs = nowMs + retryAfterSec * 1000;
    }

    this.records.set(key, {
      failures,
      lockedUntilMs,
      lastAttemptMs: nowMs,
    });

    return {
      blockedNow: lockedUntilMs > nowMs,
      retryAfterSec,
    };
  }

  clear(key: string): void {
    this.records.delete(key);
  }
}

export function createSecurityRateLimiters(config?: RateLimitPolicyConfig) {
  const loginIpLimiter = new SlidingWindowCounter(
    config?.loginIpMax ?? 20,
    config?.loginIpWindowMs ?? 15 * 60 * 1000
  );
  const loginFailureTracker = new ProgressiveCooldownTracker(
    config?.loginFailureThreshold ?? 5,
    config?.loginBaseCooldownSec ?? 30,
    config?.loginMaxCooldownSec ?? 900
  );
  const registerIpLimiter = new SlidingWindowCounter(
    config?.registerIpMax ?? 10,
    config?.registerIpWindowMs ?? 15 * 60 * 1000
  );
  const postUserLimiter = new SlidingWindowCounter(
    config?.postUserMax ?? 5,
    config?.postUserWindowMs ?? 10 * 60 * 1000
  );
  const tutorUserLimiter = new SlidingWindowCounter(
    config?.tutorUserMax ?? 20,
    config?.tutorUserWindowMs ?? 60 * 1000
  );
  const tutorIpLimiter = new SlidingWindowCounter(
    config?.tutorIpMax ?? 30,
    config?.tutorIpWindowMs ?? 60 * 1000
  );

  return {
    checkLoginAllowed(ip: string, identifier: string, nowMs = Date.now()): FixedWindowResult {
      const pairKey = `${ip}:${identifier}`;
      const cooldown = loginFailureTracker.checkBlocked(pairKey, nowMs);
      if (cooldown.blocked) {
        return { allowed: false, remaining: 0, resetInSec: cooldown.retryAfterSec };
      }

      const ipCheck = loginIpLimiter.consume(ip, nowMs);
      if (!ipCheck.allowed) {
        return ipCheck;
      }

      return ipCheck;
    },

    recordLoginFailure(ip: string, identifier: string, nowMs = Date.now()) {
      return loginFailureTracker.recordFailure(`${ip}:${identifier}`, nowMs);
    },

    clearLoginFailures(ip: string, identifier: string) {
      loginFailureTracker.clear(`${ip}:${identifier}`);
    },

    checkRegisterAllowed(ip: string, nowMs = Date.now()): FixedWindowResult {
      return registerIpLimiter.consume(ip, nowMs);
    },

    checkPostAllowed(userId: string, nowMs = Date.now()): FixedWindowResult {
      return postUserLimiter.consume(userId, nowMs);
    },

    checkTutorAllowed(userId: string, ip: string, nowMs = Date.now()): FixedWindowResult {
      const userCheck = tutorUserLimiter.checkWithoutConsume(userId, nowMs);
      if (!userCheck.allowed) {
        return userCheck;
      }
      const ipCheck = tutorIpLimiter.checkWithoutConsume(ip, nowMs);
      if (!ipCheck.allowed) {
        return ipCheck;
      }
      const userConsumed = tutorUserLimiter.consume(userId, nowMs);
      const ipConsumed = tutorIpLimiter.consume(ip, nowMs);
      return {
        allowed: true,
        remaining: Math.min(userConsumed.remaining, ipConsumed.remaining),
        resetInSec: Math.max(userConsumed.resetInSec, ipConsumed.resetInSec),
      };
    },
  };
}
