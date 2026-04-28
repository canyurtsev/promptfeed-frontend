import aiLogRepository from '../repositories/aiLog.repository.js';
import subscriptionService from '../services/subscription.service.js';
import { logger } from '../utils/logger.js';

/**
 * Premium Middleware
 * Enforces daily/rolling 24h limits for AI Playground requests
 */
export const checkAiUsageLimit = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // 1. Get user subscription plan
        const subscription = await subscriptionService.getSubscription(userId);
        
        // 2. Get usage in last 24 hours
        const usageCount = await aiLogRepository.countInLast24Hours(userId);
        
        const plan = subscription.plan || 'free';
        const planDetails = subscription.details || {};
        const limits = planDetails.limits || {};
        
        const maxDailyRuns = limits.maxDailyRuns || 5; // Default to 5 for safety

        // 3. Unlimited check
        if (maxDailyRuns === -1) {
            req.usage = { count: usageCount, limit: 'unlimited', remains: -1 };
            return next();
        }

        // 4. Enforce limit
        if (usageCount >= maxDailyRuns) {
            logger.warn(`User ${userId} reached AI limit (${usageCount}/${maxDailyRuns})`);
            return res.status(429).json({
                success: false,
                error: 'Limit Exceeded',
                message: `You have reached your daily limit of ${maxDailyRuns} AI requests. Please upgrade to Pro or wait for your 24h rolling window to reset.`,
                usage: usageCount,
                limit: maxDailyRuns
            });
        }

        // Attach usage info for the next handler
        req.usage = { count: usageCount, limit: maxDailyRuns, remains: maxDailyRuns - usageCount };
        next();
    } catch (error) {
        logger.error('Premium Middleware Error:', error);
        next(error);
    }
};
