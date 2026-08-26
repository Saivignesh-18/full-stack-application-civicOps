import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../errors/AppError.js';

// Toggle: set DISABLE_RATE_LIMIT=true in .env to bypass all rate limiting.
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === 'true';

// Pass-through middleware used when rate limiting is disabled.
const noopLimiter = (_req: Request, _res: Response, next: NextFunction) => next();

// ---- Key generators ----
const ip = (req: Request) => req.ip || 'anonymous';
const userOrIp = (req: Request) => (req as any).user?.id || req.ip || 'anonymous';
const userOnly = (req: Request) => (req as any).user?.id || req.ip || 'anonymous';
const ipAndAccount = (req: Request) => `${req.ip || 'anonymous'}:${(req.body?.email || 'unknown').toLowerCase()}`;
const sessionOrIp = (req: Request) =>
  (req as any).user?.sessionId || req.body?.refreshToken?.slice(-24) || req.ip || 'anonymous';
const tenantKey = (req: Request) => (req as any).tenant?.id || (req as any).user?.id || req.ip || 'anonymous';

interface LimiterConfig {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  message?: string;
  skip?: (req: Request) => boolean;
  // When true, only failed responses (>=400) count toward the limit.
  skipSuccessfulRequests?: boolean;
}

// Factory: builds a rate limiter (or a pass-through when disabled).
function makeLimiter({ windowMs, max, key, message, skip, skipSuccessfulRequests }: LimiterConfig) {
  if (RATE_LIMIT_DISABLED) return noopLimiter;

  const options: Partial<Options> = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: key,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError(message || 'Too many requests, please try again later'));
    },
  };
  if (skip) options.skip = skip;
  if (skipSuccessfulRequests) options.skipSuccessfulRequests = true;

  return rateLimit(options as Options);
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// ============================================
// AUTH ENDPOINT LIMITERS
// ============================================

// Login: 5 / 15 min, keyed by IP + account (only failed attempts count)
export const loginLimiter = makeLimiter({
  windowMs: 15 * MIN,
  max: 5,
  key: ipAndAccount,
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Register: 5 / hour, keyed by IP
export const registerLimiter = makeLimiter({
  windowMs: HOUR,
  max: 5,
  key: ip,
  message: 'Too many registration attempts, please try again later',
});

// Refresh token: 30 / 15 min, keyed by user/session
export const refreshLimiter = makeLimiter({
  windowMs: 15 * MIN,
  max: 30,
  key: sessionOrIp,
  message: 'Too many token refresh attempts, please try again later',
});

// Forgot password: 5 / hour, keyed by IP + account
export const forgotPasswordLimiter = makeLimiter({
  windowMs: HOUR,
  max: 5,
  key: ipAndAccount,
  message: 'Too many password reset requests, please try again later',
});

// ============================================
// METHOD-BASED GENERAL LIMITERS (applied to all /api)
// ============================================

// Normal GET APIs: 100 / min, keyed by user/IP
export const getLimiter = makeLimiter({
  windowMs: MIN,
  max: 100,
  key: userOrIp,
  message: 'Too many requests, please slow down',
  skip: (req) => req.method !== 'GET',
});

// POST/PUT/PATCH writes: 30 / min, keyed by user
export const writeLimiter = makeLimiter({
  windowMs: MIN,
  max: 30,
  key: userOnly,
  message: 'Too many write requests, please slow down',
  skip: (req) => !['POST', 'PUT', 'PATCH'].includes(req.method),
});

// DELETE: 20 / min, keyed by user
export const deleteLimiter = makeLimiter({
  windowMs: MIN,
  max: 20,
  key: userOnly,
  message: 'Too many delete requests, please slow down',
  skip: (req) => req.method !== 'DELETE',
});

// ============================================
// RESOURCE-SPECIFIC LIMITERS
// ============================================

// Complaint creation: 10 / hour, keyed by citizen (user)
export const complaintCreateLimiter = makeLimiter({
  windowMs: HOUR,
  max: 10,
  key: userOnly,
  message: 'Complaint creation limit reached, please try again later',
});

// File upload: 10 / 10 min, keyed by user
export const uploadRateLimiter = makeLimiter({
  windowMs: 10 * MIN,
  max: 10,
  key: userOnly,
  message: 'Upload limit exceeded, please try again later',
});

// Report generation: 5 / 10 min, keyed by user
export const reportLimiter = makeLimiter({
  windowMs: 10 * MIN,
  max: 5,
  key: userOnly,
  message: 'Report generation limit exceeded, please try again later',
});

// Chatbot: 20 / min, keyed by user
export const chatbotRateLimiter = makeLimiter({
  windowMs: MIN,
  max: 20,
  key: userOnly,
  message: 'Chatbot rate limit exceeded, please slow down',
});

// Webhook registration: 10 / hour, keyed by tenant
export const webhookLimiter = makeLimiter({
  windowMs: HOUR,
  max: 10,
  key: tenantKey,
  message: 'Webhook registration limit exceeded, please try again later',
});

// Public APIs: 60 / min, keyed by IP
export const publicLimiter = makeLimiter({
  windowMs: MIN,
  max: 60,
  key: ip,
  message: 'Too many requests, please try again later',
});

// Admin APIs: 120 / min, keyed by user
export const adminLimiter = makeLimiter({
  windowMs: MIN,
  max: 120,
  key: userOnly,
  message: 'Too many admin requests, please slow down',
});

// ============================================
// BACKWARD-COMPAT ALIASES
// ============================================
// Existing routes import authRateLimiter / apiRateLimiter.
export const authRateLimiter = loginLimiter;
export const apiRateLimiter = getLimiter;

if (RATE_LIMIT_DISABLED) {
  // eslint-disable-next-line no-console
  console.warn('[RATE LIMIT] All rate limiting is DISABLED (DISABLE_RATE_LIMIT=true)');
}
