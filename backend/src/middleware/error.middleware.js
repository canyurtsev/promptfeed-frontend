import { logger } from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // Standardized Error Codes Mapping
    const errorCodes = {
        'ValidationError': 'VALIDATION_ERROR',
        'UnauthorizedError': 'UNAUTHORIZED',
        'ForbiddenError': 'FORBIDDEN',
        'NotFoundError': 'NOT_FOUND',
        'JsonWebTokenError': 'UNAUTHORIZED',
        'TokenExpiredError': 'UNAUTHORIZED',
        'RateLimitError': 'RATE_LIMITED'
    };

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            code: err.errorCode || errorCodes[err.name] || 'INTERNAL_ERROR',
            message: message,
            requestId: req.requestId || err.requestId,
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err.details
            })
        }
    });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error classes
 */
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400);
        this.details = details;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
