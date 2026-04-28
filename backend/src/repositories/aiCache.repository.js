import prisma from '../config/database.js';

class AiCacheRepository {
    async findByHash(promptHash) {
        return prisma.apiCache.findUnique({
            where: { promptHash }
        });
    }

    async findManyLatest(limit = 500) {
        return prisma.apiCache.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    async create(data) {
        return prisma.apiCache.create({ data });
    }

    async incrementHit(id) {
        return prisma.apiCache.update({
            where: { id },
            data: { hits: { increment: 1 } }
        });
    }
}

export default new AiCacheRepository();
