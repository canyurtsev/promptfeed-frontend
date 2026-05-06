import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Prompt Repository
 * Handles all database operations for Prompt, PromptVote, PromptBookmark, PromptSave models
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
        const prompt = await prisma.prompt.findUnique({ where: { id }, select: { score: true } });
        const newScore = Math.max(0, (prompt?.score || 0) + scoreImpact);
        return await prisma.prompt.update({
            where: { id },
            data: { score: newScore }
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
            select: { promptId: true }
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

    // â”€â”€ Save Operations â”€â”€

    async findSave(promptId, userId) {
        const rows = await prisma.$queryRaw`
            SELECT id, "promptId", "userId", "createdAt"
            FROM "PromptSave"
            WHERE "promptId" = ${promptId} AND "userId" = ${userId}
            LIMIT 1
        `;
        return rows[0] || null;
    }

    async createSave(data) {
        const id = randomUUID();
        const rows = await prisma.$queryRaw`
            INSERT INTO "PromptSave" ("id", "promptId", "userId")
            VALUES (${id}, ${data.promptId}, ${data.userId})
            ON CONFLICT ("promptId", "userId") DO UPDATE SET "promptId" = EXCLUDED."promptId"
            RETURNING id, "promptId", "userId", "createdAt"
        `;
        return rows[0];
    }

    async deleteSave(promptId, userId) {
        return await prisma.$executeRaw`
            DELETE FROM "PromptSave"
            WHERE "promptId" = ${promptId} AND "userId" = ${userId}
        `;
    }

    async findUserSavesForPrompts(userId, promptIds) {
        if (!promptIds.length) return [];
        return await prisma.$queryRaw`
            SELECT "promptId"
            FROM "PromptSave"
            WHERE "userId" = ${userId} AND "promptId" IN (${Prisma.join(promptIds)})
        `;
    }

    async findUserSavedPrompts(userId) {
        const rows = await prisma.$queryRaw`
            SELECT
                s.id AS "saveId",
                s."createdAt" AS "savedAt",
                p.id,
                p.title,
                p.description,
                p.tags,
                p."createdAt",
                p.score,
                u.id AS "userId",
                u.username,
                u."fullName",
                u."avatarUrl"
            FROM "PromptSave" s
            JOIN "Prompt" p ON p.id = s."promptId"
            JOIN "User" u ON u.id = p."userId"
            WHERE s."userId" = ${userId}
            ORDER BY s."createdAt" DESC
        `;

        return rows.map(row => ({
            id: row.saveId,
            createdAt: row.savedAt,
            prompt: {
                id: row.id,
                title: row.title,
                description: row.description,
                tags: typeof row.tags === 'string' ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                createdAt: row.createdAt,
                score: row.score,
                user: {
                    id: row.userId,
                    username: row.username,
                    fullName: row.fullName,
                    avatarUrl: row.avatarUrl
                }
            }
        }));
    }

    // ── Purchase Operations (Mock) ──

    async findPurchase(promptId, userId) {
        return await prisma.promptPurchase.findUnique({
            where: { userId_promptId: { promptId, userId } }
        });
    }

    async createPurchase(data) {
        return await prisma.promptPurchase.create({ data });
    }

    // ── Execution Operations ──

    async createExecution(data) {
        return await prisma.promptExecution.create({ data });
    }

    async findExecutionsByUser(userId) {
        return await prisma.promptExecution.findMany({
            where: { userId },
            include: {
                prompt: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}

export default new PromptRepository();
