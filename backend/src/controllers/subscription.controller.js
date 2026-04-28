import subscriptionService from '../services/subscription.service.js';

/**
 * Subscription Controller
 * Handles HTTP request/response for subscription endpoints
 */
class SubscriptionController {
    async getPlans(req, res) {
        const plans = subscriptionService.getPlans();

        res.json({
            success: true,
            data: plans
        });
    }

    async getSubscription(req, res) {
        const subscription = await subscriptionService.getSubscription(req.user.id);

        res.json({
            success: true,
            data: subscription
        });
    }

    async subscribe(req, res) {
        const result = await subscriptionService.subscribe(req.user.id, req.body);

        res.json({
            success: true,
            data: result
        });
    }

    async cancel(req, res) {
        const result = await subscriptionService.cancelSubscription(req.user.id);

        res.json({
            success: true,
            data: result
        });
    }
}

export default new SubscriptionController();
