import rateLimit from 'express-rate-limit';

/**
 * Custom key generator: userId if authenticated, else IP + User-Agent fallback
 */
const keyGenerator = (req) => {
    if (req.user && req.user.id) {
        return req.user.id;
    }
    // Fallback to IP + User-Agent to prevent basic evasion
    return `${req.ip}-${req.get('user-agent') || 'no-ua'}`;
};

/**
 * Standardized rate limit handler
 */
const handler = (req, res, next, options) => {
    res.status(options.statusCode).json({
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: options.message,
            requestId: req.requestId
        }
    });
};

/**
 * Purchase Limiter: 3 requests per minute per user/identity
 */
export const purchaseLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3,
    message: 'Too many purchase attempts. Please wait a minute.',
    keyGenerator,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Playground Limiter: 10 requests per minute per user/identity
 */
export const playgroundLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: 'Playground rate limit exceeded. Please wait a minute.',
    keyGenerator,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
});
