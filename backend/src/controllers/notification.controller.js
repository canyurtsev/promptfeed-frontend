import notificationService from '../services/notification.service.js';

class NotificationController {
    async getAll(req, res, next) {
        try {
            const result = await notificationService.getByUser(req.user.id, req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req, res, next) {
        try {
            await notificationService.markAsRead(req.params.id);
            res.json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req, res, next) {
        try {
            await notificationService.markAllAsRead(req.user.id);
            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req, res, next) {
        try {
            const count = await notificationService.getUnreadCount(req.user.id);
            res.json({ success: true, data: { unreadCount: count } });
        } catch (error) {
            next(error);
        }
    }
}

export default new NotificationController();
