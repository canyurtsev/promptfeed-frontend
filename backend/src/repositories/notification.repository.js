import prisma from '../config/database.js';

/**
 * Notification Repository
 * Handles all database operations for the Notification model
 */
class NotificationRepository {
    async findByUser(userId, { skip, take }) {
        return await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    }

    async countByUser(userId) {
        return await prisma.notification.count({ where: { userId } });
    }

    async countUnread(userId) {
        return await prisma.notification.count({
            where: { userId, read: false }
        });
    }

    async findById(id) {
        return await prisma.notification.findUnique({ where: { id } });
    }

    async create(data) {
        return await prisma.notification.create({ data });
    }

    async markAsRead(id) {
        return await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
    }

    async markAllAsRead(userId) {
        return await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
    }
}

export default new NotificationRepository();
