import prisma from '../config/database.js';

class AILogRepository {
    async create(data) {
        return prisma.aILog.create({
            data: {
                userId: data.userId || null,
                model: data.model,
                tokens: data.tokens || 0,
                latencyMs: data.latencyMs || 0,
                cacheHit: data.cacheHit || false,
                source: data.source || null
            }
        });
    }

    async countInLast24Hours(userId) {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        return prisma.aILog.count({
            where: {
                userId,
                createdAt: {
                    gte: yesterday
                }
            }
        });
    }

    async findByUserId(userId, { skip = 0, take = 10 } = {}) {
        return prisma.aILog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    }
}

export default new AILogRepository();
