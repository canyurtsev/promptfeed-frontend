import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// ============================================
// RATE LIMIT CONFIGURATION (Tier-based)
// ============================================

const AI_RATE_LIMITS = {
    free:       { windowMs: 60 * 60 * 1000, max: 20  },  // 20 req / hour
    authenticated: { windowMs: 60 * 60 * 1000, max: 50  },  // 50 req / hour
    pro:        { windowMs: 60 * 60 * 1000, max: 200 },  // 200 req / hour
    enterprise: { windowMs: 60 * 60 * 1000, max: -1  },  // unlimited (skipped)
};

/**
 * Resolve rate limit tier from request context.
 * Priority: subscription plan → authenticated → free (IP-based)
 */
function resolveUserTier(req) {
    if (!req.user) return 'free';

    // Check subscription plan attached by upstream middleware or from user role
    const plan = req.user.subscriptionPlan || req.user.plan;
    if (plan === 'enterprise') return 'enterprise';
    if (plan === 'pro') return 'pro';

    return 'authenticated';
}

/**
 * Generate a unique key per user or IP.
 * Authenticated users are keyed by userId; anonymous by IP.
 */
function aiKeyGenerator(req) {
    return req.user?.id || req.headers['x-forwarded-for'] || req.ip;
}

// ============================================
// AI RATE LIMITER
// ============================================

/**
 * AI endpoint rate limiter.
 * - Tier-aware (free / authenticated / pro / enterprise)
 * - Enterprise users bypass entirely
 * - Cache hits do NOT count against the limit
 * - Uses standard RateLimit headers (draft-6)
 */
export const aiRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour (default window)

    // Dynamic max based on user tier
    max: (req) => {
        const tier = resolveUserTier(req);
        const config = AI_RATE_LIMITS[tier] || AI_RATE_LIMITS.free;
        return config.max === -1 ? 0 : config.max; // 0 = unlimited in express-rate-limit
    },

    // Enterprise users skip rate limiting entirely
    skip: (req) => {
        const tier = resolveUserTier(req);
        return tier === 'enterprise';
    },

    // Do not count cache hits against the rate limit
    skipSuccessfulRequests: false,
    requestWasSuccessful: (req, res) => {
        // If the response indicates a cache hit, treat as "not countable"
        // The controller/service should set res.locals.cacheHit = true
        return !res.locals.cacheHit;
    },

    // Use userId or IP as the rate limit key
    keyGenerator: aiKeyGenerator,

    // Standard headers (RateLimit-*, no X-RateLimit-*)
    standardHeaders: true,
    legacyHeaders: false,

    // 429 response
    handler: (req, res) => {
        const tier = resolveUserTier(req);
        const config = AI_RATE_LIMITS[tier] || AI_RATE_LIMITS.free;

        logger.warn(`Rate limit exceeded for ${aiKeyGenerator(req)} (tier: ${tier})`);

        res.status(429).json({
            success: false,
            error: 'Rate Limit Exceeded',
            message: `You have exceeded the rate limit of ${config.max} AI requests per hour. Please wait before trying again.`,
            retryAfter: Math.ceil(config.windowMs / 1000),
            tier: tier
        });
    }
});

// ============================================
// AUTH RATE LIMITER
// ============================================

/**
 * Strict rate limiter for authentication endpoints.
 * Prevents brute-force attacks on /login and /register.
 * Only counts failed attempts (skipSuccessfulRequests: true).
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 failed attempts per 15 min per IP

    // Only count failed requests (4xx/5xx) — successful logins don't burn quota
    skipSuccessfulRequests: true,

    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.headers['x-forwarded-for'] || req.ip}`);

        res.status(429).json({
            success: false,
            error: 'Too Many Attempts',
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
            retryAfter: 900
        });
    }
});
