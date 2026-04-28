import { logger } from '../utils/logger.js';

/**
 * Analytics Service
 * Logs key user actions via structured Winston logging.
 * Uses the same pattern as AiLog but for general user activity.
 *
 * Events are logged as structured JSON and can be queried
 * from log files or forwarded to a log management system.
 */
class AnalyticsService {
    /**
     * Log a user action.
     * @param {string} event - Event type (prompt_created, playground_executed, vote_submitted, prompt_viewed)
     * @param {string|null} userId - User ID (null for anonymous)
     * @param {Object} metadata - Additional event data
     */
    track(event, userId = null, metadata = {}) {
        logger.info(`[ANALYTICS] ${event}`, {
            event,
            userId,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    }

    // ── Convenience Methods ──

    promptCreated(userId, promptId, title) {
        this.track('prompt_created', userId, { promptId, title });
    }

    playgroundExecuted(userId, model, tokens, cacheHit) {
        this.track('playground_executed', userId, { model, tokens, cacheHit });
    }

    voteSubmitted(userId, promptId, value, newScore) {
        this.track('vote_submitted', userId, { promptId, value, newScore });
    }

    promptViewed(userId, promptId) {
        this.track('prompt_viewed', userId, { promptId });
    }

    userLogin(userId, method) {
        this.track('user_login', userId, { method });
    }

    userRegistered(userId) {
        this.track('user_registered', userId);
    }
}

export default new AnalyticsService();
