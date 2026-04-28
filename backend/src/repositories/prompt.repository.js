import prisma from '../config/database.js';

/**
 * Prompt Repository
 * Handles all database operations for Prompt, PromptVote, PromptBookmark models
 */
class PromptRepository {
    // ── Prompt CRUD ──

    async findAll({ where, orderBy, skip, take }) {
        return await prisma.prompt.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                },
                product: true,
                _count: { select: { votes: true, bookmarks: true } }
            }
        });
    }

    async count(where) {
        return await prisma.prompt.count({ where });
    }

    async findById(id) {
        return await prisma.prompt.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true, bio: true }
                },
                product: true,
                _count: { select: { votes: true, bookmarks: true } }
            }
        });
    }

    async findByIdSimple(id) {
        return await prisma.prompt.findUnique({ where: { id } });
    }

    async create(data) {
        return await prisma.prompt.create({
            data,
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                }
            }
        });
    }

    async update(id, data) {
        return await prisma.prompt.update({
            where: { id },
            data,
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                }
            }
        });
    }

    async updateSimple(id, data) {
        return await prisma.prompt.update({ where: { id }, data });
    }

    async delete(id) {
        return await prisma.prompt.delete({ where: { id } });
    }

    async incrementViews(id) {
        return await prisma.$transaction([
            prisma.prompt.update({
                where: { id },
                data: { viewsCount: { increment: 1 } }
            }),
            prisma.promptMetrics.upsert({
                where: { promptId: id },
                update: { views: { increment: 1 } },
                create: { promptId: id, views: 1 }
            })
        ]);
    }

    async recordRun(promptId, userId, { tokens, latencyMs, cacheHit, source }) {
        return await prisma.$transaction([
            prisma.promptMetrics.upsert({
                where: { promptId },
                update: { runs: { increment: 1 } },
                create: { promptId, runs: 1 }
            }),
            prisma.aILog.create({
                data: {
                    userId,
                    model: 'ai-reasoner', // Default or from metadata
                    tokens,
                    latencyMs,
                    cacheHit,
                    source,
                    // Note: AILog schema doesn't have promptId directly, but we can add to source or metadata if needed.
                    // For now, promptMetrics tracks the prompt link.
                }
            })
        ]);
    }

    async updateScore(id, scoreImpact) {
        return await prisma.prompt.update({
            where: { id },
            data: { score: { increment: scoreImpact } }
        });
    }

    async updateBookmarkCount(id, increment) {
        return await prisma.prompt.update({
            where: { id },
            data: { bookmarksCount: { [increment ? 'increment' : 'decrement']: 1 } }
        });
    }

    // ── Vote Operations ──

    async findVote(promptId, userId) {
        return await prisma.promptVote.findUnique({
            where: { promptId_userId: { promptId, userId } }
        });
    }

    async createVote(data) {
        return await prisma.promptVote.create({ data });
    }

    async updateVote(id, data) {
        return await prisma.promptVote.update({ where: { id }, data });
    }

    async deleteVote(id) {
        return await prisma.promptVote.delete({ where: { id } });
    }

    /**
     * Batch-fetch a user's votes for multiple prompts (feed view).
     */
    async findUserVotesForPrompts(userId, promptIds) {
        return await prisma.promptVote.findMany({
            where: {
                userId,
                promptId: { in: promptIds }
            },
            select: { promptId: true, value: true }
        });
    }

    /**
     * Count how many votes a user has cast in the last 24 hours.
     * Used for daily vote limit enforcement.
     */
    async countUserVotesToday(userId) {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        return await prisma.promptVote.count({
            where: {
                userId,
                createdAt: { gte: yesterday }
            }
        });
    }

    // ── Bookmark Operations ──

    async findBookmark(promptId, userId) {
        return await prisma.promptBookmark.findUnique({
            where: { promptId_userId: { promptId, userId } }
        });
    }

    async createBookmark(data) {
        return await prisma.promptBookmark.create({ data });
    }

    async deleteBookmark(id) {
        return await prisma.promptBookmark.delete({ where: { id } });
    }

    async findUserBookmarks(userId) {
        return await prisma.promptBookmark.findMany({
            where: { userId },
            include: {
                prompt: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatarUrl: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}

export default new PromptRepository();
