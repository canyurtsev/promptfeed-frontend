import prisma from '../config/database.js';

class UserRepository {
    async findById(id) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { prompts: true, skills: true }
                }
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
}

export default new UserRepository();
