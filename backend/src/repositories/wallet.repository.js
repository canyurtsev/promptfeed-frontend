import prisma from '../config/database.js';

class WalletRepository {
    async findByUserId(userId) {
        return prisma.wallet.findUnique({
            where: { userId }
        });
    }

    async upsert(userId, update, create) {
        return prisma.wallet.upsert({
            where: { userId },
            update,
            create: {
                userId,
                ...create
            }
        });
    }

    async creditBalance(userId, amount) {
        return prisma.wallet.upsert({
            where: { userId },
            update: {
                balance: { increment: amount },
                totalEarnings: { increment: amount }
            },
            create: {
                userId,
                balance: amount,
                totalEarnings: amount
            }
        });
    }

    async debitBalance(userId, amount) {
        return prisma.wallet.update({
            where: { userId },
            data: {
                balance: { decrement: amount },
                totalSpent: { increment: amount }
            }
        });
    }

    async requestPayout(userId, amount) {
        return prisma.wallet.update({
            where: { userId },
            data: {
                balance: { decrement: amount },
                pendingPayouts: { increment: amount }
            }
        });
    }
}

export default new WalletRepository();
