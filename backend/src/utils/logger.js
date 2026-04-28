import winston from 'winston';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Define custom levels
const levels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
};

// Define colors for levels
const colors = {
    fatal: 'red underline',
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'gray'
};

winston.addColors(colors);

// Custom text format for development console
const devFormat = printf(({ level, message, timestamp, stack, requestId, ...metadata }) => {
    let msg = `${timestamp} [${level}]${requestId ? ` (${requestId})` : ''}: ${message}`;
    if (Object.keys(metadata).length > 0) msg += ` ${JSON.stringify(metadata)}`;
    if (stack) msg += `\n${stack}`;
    return msg;
});

// Create logger instance
export const logger = winston.createLogger({
    levels,
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    transports: [
        // Console - used for all environments
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? json() // Strict JSON in production
                : combine(colorize(), devFormat)
        }),
        // File transports for persistent auditing
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: json()
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: json()
        })
    ]
});

// Add shorthand for fatal
logger.fatal = (message, meta) => logger.log('fatal', message, meta);

export default logger;

