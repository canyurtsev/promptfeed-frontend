import prisma from '../config/database.js';

class OAuthRepository {
    async createState(data) {
        return prisma.oAuthState.create({ data });
    }

    async findByState(state) {
        return prisma.oAuthState.findUnique({
            where: { state },
            include: { user: true }
        });
    }

    async findByCode(code) {
        return prisma.oAuthState.findUnique({
            where: { code },
            include: { user: true }
        });
    }

    async updateStateCode(id, code) {
        return prisma.oAuthState.update({
            where: { id },
            data: { code, codeUsed: false }
        });
    }

    async markCodeUsed(id) {
        return prisma.oAuthState.update({
            where: { id },
            data: { codeUsed: true }
        });
    }

    async deleteExpiredStates(beforeDate) {
        return prisma.oAuthState.deleteMany({
            where: {
                expiresAt: { lt: beforeDate }
            }
        });
    }

    async createOAuthAccount(data) {
        return prisma.oAuthAccount.create({ data });
    }

    async findOAuthAccount(provider, providerId) {
        return prisma.oAuthAccount.findUnique({
            where: {
                provider_providerId: { provider, providerId }
            }
        });
    }

    async findOAuthAccountByEmail(provider, email) {
        return prisma.oAuthAccount.findUnique({
            where: {
                provider_email: { provider, email }
            }
        });
    }

    async findUserByEmail(email) {
        return prisma.user.findUnique({
            where: { email }
        });
    }

    async createUser(data) {
        return prisma.user.create({ data });
    }

    async findByUsername(username) {
        return prisma.user.findUnique({
            where: { username }
        });
    }
}

export default new OAuthRepository();