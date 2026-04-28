import { PrismaClient } from '@prisma/client';

/**
 * Prisma Singleton Client
 * Ensures only one PrismaClient instance exists across the application
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // In development, use a global variable to preserve the client across hot-reloads
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            log: ['query', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

export default prisma;
