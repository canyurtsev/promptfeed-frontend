import prisma from '../config/database.js';

class UserRepository {
    async findById(id) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { prompts: true, skills: true }
                },
                subscription: true,
                wallet: true
            }
        });
    }

    /**
     * Find user by ID (public-safe — excludes passwordHash)
     */
    async findByIdPublic(id) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                emailVerified: true,
                wallet: {
                    select: {
                        balance: true,
                        totalEarnings: true,
                        totalSpent: true
                    }
                },
                ownerships: {
                    select: {
                        productId: true
                    }
                },
                subscription: {
                    select: {
                        plan: true,
                        status: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });
    }

    async findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }

    async findByUsername(username) {
        return prisma.user.findUnique({ where: { username } });
    }

    /**
     * Find user by email or username (login flow).
     * If identifier contains "@", search by email; otherwise by username.
     * Returns full user record including passwordHash for password verification.
     */
    async findByEmailOrUsername(identifier) {
        if (identifier.includes('@')) {
            return prisma.user.findUnique({ where: { email: identifier } });
        }
        return prisma.user.findUnique({ where: { username: identifier } });
    }

    /**
     * Check if a user already exists with the given email OR username (registration).
     */
    async findExistingByEmailOrUsername(email, username) {
        return prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });
    }

    async create(data) {
        return prisma.user.create({ data });
    }

    async update(id, data) {
        return prisma.user.update({
            where: { id },
            data
        });
    }

    async findSavedPrompts(userId) {
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

    async findPurchasedPrompts(userId) {
        const rows = await prisma.$queryRaw`
            SELECT
                pp.id AS "purchaseId",
                pp."createdAt" AS "purchasedAt",
                pp."pricePaid",
                p.id,
                p.title,
                p.tags,
                p."createdAt",
                p.score
            FROM "PromptPurchase" pp
            JOIN "Prompt" p ON p.id = pp."promptId"
            WHERE pp."userId" = ${userId}
            ORDER BY pp."createdAt" DESC
        `;

        return rows.map(row => ({
            id: row.id,
            title: row.title,
            tags: typeof row.tags === 'string' ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            createdAt: row.createdAt,
            score: row.score,
            price: row.pricePaid
        }));
    }
}

export default new UserRepository();
