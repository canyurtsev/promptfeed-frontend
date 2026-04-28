import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to generate and attach a unique requestId to every request
 */
export const requestCorrelation = (req, res, next) => {
    // Generate UUID
    const requestId = uuidv4();

    // Attach to request object for downstream use (logging, error handling)
    req.requestId = requestId;

    // Attach to response header for client-side traceability
    res.setHeader('X-Request-Id', requestId);

    next();
};
