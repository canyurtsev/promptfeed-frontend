import notificationRepository from '../repositories/notification.repository.js';

class NotificationService {
    async create(userId, type, message, metadata = {}) {
        return notificationRepository.create({
            userId,
            type,
            message,
            metadata: JSON.stringify(metadata)
        });
    }

    async getByUser(userId, { page = 1, limit = 20 } = {}) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            notificationRepository.findByUser(userId, { skip, take: limit }),
            notificationRepository.countByUser(userId)
        ]);

        return {
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }
        };
    }

    async getUnreadCount(userId) {
        return notificationRepository.countUnread(userId);
    }

    async markAsRead(id) {
        return notificationRepository.markAsRead(id);
    }

    async markAllAsRead(userId) {
        return notificationRepository.markAllAsRead(userId);
    }
}

export default new NotificationService();
