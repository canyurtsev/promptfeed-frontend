import prisma from '../config/database.js';

class SubscriptionRepository {
    async findByUserId(userId) {
        return prisma.subscription.findUnique({
            where: { userId }
        });
    }

    async create(data) {
        return prisma.subscription.create({ data });
    }

    async upsert(userId, data) {
        return prisma.subscription.upsert({
            where: { userId },
            update: data,
            create: {
                userId,
                ...data
            }
        });
    }

    async update(userId, data) {
        return prisma.subscription.update({
            where: { userId },
            data
        });
    }

    async delete(userId) {
        return prisma.subscription.delete({
            where: { userId }
        });
    }
}

export default new SubscriptionRepository();
