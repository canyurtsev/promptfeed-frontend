import subscriptionRepository from '../repositories/subscription.repository.js';
import { validate, subscribeSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError } from '../middleware/error.middleware.js';

/**
 * Subscription Plans Definition
 */
const PLANS = {
    free: {
        id: 'plan_free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
            'Browse public prompts',
            'Create up to 5 prompts',
            'Basic community access',
            'Standard support'
        ],
        limits: {
            maxPrompts: 5,
            maxPurchases: 3,
            canSell: false,
            maxDailyRuns: 5
        }
    },
    pro: {
        id: 'plan_pro',
        name: 'Pro',
        price: 9.99,
        interval: 'month',
        features: [
            'Unlimited prompts',
            'Sell on marketplace',
            'Advanced analytics',
            'Priority support',
            'Boost prompts',
            'No marketplace fees for first 10 sales'
        ],
        limits: {
            maxPrompts: -1,
            maxPurchases: -1,
            canSell: true,
            freeMarketplaceSales: 10,
            maxDailyRuns: 100 // Large limit for Pro
        }
    },
    enterprise: {
        id: 'plan_enterprise',
        name: 'Enterprise',
        price: 29.99,
        interval: 'month',
        features: [
            'Everything in Pro',
            'Team collaboration (up to 10 users)',
            'API access',
            'Custom branding',
            'Dedicated support',
            'Advanced security features'
        ],
        limits: {
            maxPrompts: -1,
            maxPurchases: -1,
            canSell: true,
            teamMembers: 10,
            apiAccess: true,
            zeroFees: true,
            maxDailyRuns: -1 // Unlimited
        }
    }
};

/**
 * Subscription Service
 * Handles plan management and user subscriptions
 */
class SubscriptionService {
    /**
     * Get all available plans
     */
    getPlans() {
        return Object.entries(PLANS).map(([key, plan]) => ({
            key,
            ...plan
        }));
    }

    /**
     * Get current user subscription
     */
    async getSubscription(userId) {
        const subscription = await subscriptionRepository.findByUserId(userId);

        if (!subscription) {
            return {
                plan: 'free',
                status: 'active',
                details: PLANS.free
            };
        }

        return {
            ...subscription,
            details: PLANS[subscription.plan] || PLANS.free
        };
    }

    /**
     * Subscribe to a plan
     */
    async subscribe(userId, data) {
        const validation = validate(subscribeSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const { plan } = validation.data;

        if (!PLANS[plan]) {
            throw new ValidationError('Invalid plan');
        }

        // Check existing subscription
        const existing = await subscriptionRepository.findByUserId(userId);

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        if (existing) {
            // Update existing subscription
            const updated = await subscriptionRepository.update(userId, {
                plan,
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: false
            });

            return {
                ...updated,
                details: PLANS[plan],
                message: 'Subscription updated successfully'
            };
        }

        // Create new subscription
        const subscription = await subscriptionRepository.create({
            userId,
            plan,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false
        });

        return {
            ...subscription,
            details: PLANS[plan],
            message: 'Subscribed successfully'
        };
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId) {
        const subscription = await subscriptionRepository.findByUserId(userId);

        if (!subscription) {
            throw new NotFoundError('No active subscription found');
        }

        if (subscription.status === 'cancelled') {
            throw new ValidationError('Subscription is already cancelled');
        }

        const updated = await subscriptionRepository.update(userId, {
            cancelAtPeriodEnd: true,
            status: 'cancelling'
        });

        return {
            ...updated,
            message: 'Subscription will be cancelled at the end of the current period',
            cancelDate: updated.currentPeriodEnd
        };
    }
}

export default new SubscriptionService();
