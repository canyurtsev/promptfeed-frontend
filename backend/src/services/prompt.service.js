import promptRepository from '../repositories/prompt.repository.js';
import subscriptionRepository from '../repositories/subscription.repository.js';
import { validate, createPromptSchema, updatePromptSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';
import analytics from './analytics.service.js';
import { serializeDecimals } from '../utils/serialization.js';

// ── Daily Vote Limits (per subscription tier) ──
const DAILY_VOTE_LIMITS = {
    free: 5,
    authenticated: 10,
    pro: 50,
    enterprise: -1 // unlimited
};

/**
 * Compute time-decay hot score (HN-style).
 * score = votes / pow((hours_since_post + 2), 1.5)
 */
function computeHotScore(votes, createdAt) {
    const hoursSincePost = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return votes / Math.pow(hoursSincePost + 2, 1.5);
}

/**
 * Compute trending score (views + votes weighted, short time bias).
 * trending = (views * 0.3 + votes * 0.7) / pow((hours + 2), 1.2)
 */
function computeTrendingScore(votes, views, createdAt) {
    const hoursSincePost = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const combined = (views * 0.3) + (votes * 0.7);
    return combined / Math.pow(hoursSincePost + 2, 1.2);
}

/**
 * Prompt Service
 * Handles prompt CRUD, upvoting, ranking, and feed operations
 */
class PromptService {
    /**
     * Create a new prompt
     */
    async create(userId, data) {
        const validation = validate(createPromptSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const prompt = await promptRepository.create({
            userId,
            ...validation.data
        });

        // Analytics: track prompt creation
        analytics.promptCreated(userId, prompt.id, prompt.title);

        return serializeDecimals(prompt);
    }

    /**
     * Get all prompts with filtering, sorting, pagination
     * @param {string|null} currentUserId - If provided, includes user's vote state per prompt
     */
    async getAll({ category, tag, sort = 'latest', search, page = 1, limit = 20 }, currentUserId = null) {
        const skip = (page - 1) * limit;
        const where = {};

        if (category) where.category = category;
        if (tag) where.tags = { contains: tag, mode: 'insensitive' };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Sorting — hot/trending use time-decay computed in JS
        const useTimeDecay = (sort === 'hot' || sort === 'trending');
        let orderBy;
        switch (sort) {
            case 'top':
                orderBy = { score: 'desc' };
                break;
            case 'hot':
            case 'trending':
                // Fetch by score desc, then re-rank with time-decay in JS
                orderBy = { score: 'desc' };
                break;
            case 'views':
                orderBy = { viewsCount: 'desc' };
                break;
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'new':
            case 'latest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        // For time-decay sorts, fetch a larger window and re-rank
        const fetchLimit = useTimeDecay ? Math.max(parseInt(limit) * 5, 100) : parseInt(limit);

        const [rawPrompts, total] = await Promise.all([
            promptRepository.findAll({ where, orderBy, skip: useTimeDecay ? 0 : skip, take: fetchLimit }),
            promptRepository.count(where)
        ]);

        // Apply time-decay ranking if needed
        let prompts = rawPrompts;
        if (useTimeDecay && prompts.length > 0) {
            prompts = prompts.map(p => ({
                ...p,
                _hotScore: sort === 'trending'
                    ? computeTrendingScore(p.score, p.viewsCount, p.createdAt)
                    : computeHotScore(p.score, p.createdAt)
            }));
            prompts.sort((a, b) => b._hotScore - a._hotScore);
            // Paginate after ranking
            prompts = prompts.slice(skip, skip + parseInt(limit));
        }

        // Batch-fetch user's votes for these prompts (if authenticated)
        let userVotes = {};
        if (currentUserId && prompts.length > 0) {
            const promptIds = prompts.map(p => p.id);
            const votes = await promptRepository.findUserVotesForPrompts(currentUserId, promptIds);
            votes.forEach(v => { userVotes[v.promptId] = v.value; });
        }

        // Attach userVote, normalize tags, remove internal scores
        const enrichedPrompts = prompts.map(p => {
            const { _hotScore, ...rest } = p;
            return {
                ...rest,
                userVote: userVotes[p.id] || 0,
                tags: typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : (p.tags || [])
            };
        });

        return serializeDecimals({
            prompts: enrichedPrompts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }

    /**
     * Get single prompt by ID
     */
    async getById(id, currentUserId = null) {
        const prompt = await promptRepository.findById(id);

        if (!prompt) {
            throw new NotFoundError('Prompt not found');
        }

        // Increment view count
        await promptRepository.incrementViews(id);

        // Analytics: track prompt view
        analytics.promptViewed(currentUserId, id);

        // Add user-specific status if logged in
        let userVote = 0;
        let isBookmarked = false;

        if (currentUserId) {
            const [vote, bookmark] = await Promise.all([
                promptRepository.findVote(id, currentUserId),
                promptRepository.findBookmark(id, currentUserId)
            ]);

            if (vote) userVote = vote.value;
            if (bookmark) isBookmarked = true;
        }

        return serializeDecimals({
            ...prompt,
            userVote,
            isBookmarked
        });
    }

    /**
     * Get user bookmarks
     */
    async getUserBookmarks(userId) {
        const bookmarks = await promptRepository.findUserBookmarks(userId);
        return bookmarks.map(b => b.prompt);
    }

    /**
     * Update prompt (owner only)
     */
    async update(id, userId, data) {
        const prompt = await promptRepository.findByIdSimple(id);

        if (!prompt) throw new NotFoundError('Prompt not found');
        if (prompt.userId !== userId) throw new ForbiddenError('Not authorized to update this prompt');

        const validation = validate(updatePromptSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const updated = await promptRepository.update(id, validation.data);
        return serializeDecimals(updated);
    }

    /**
     * Delete prompt (owner only)
     */
    async delete(id, userId) {
        const prompt = await promptRepository.findByIdSimple(id);

        if (!prompt) throw new NotFoundError('Prompt not found');
        if (prompt.userId !== userId) throw new ForbiddenError('Not authorized to delete this prompt');

        await promptRepository.delete(id);
        return { message: 'Prompt deleted successfully' };
    }

    /**
     * Vote on a prompt (Reddit-style)
     * Handles Upvote (1), Downvote (-1), and Toggle
     */
    async vote(promptId, userId, value) {
        if (![1, -1].includes(value)) {
            throw new ValidationError('Vote value must be 1 (up) or -1 (down)');
        }

        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        // ── Daily Vote Limit Check ──
        const subscription = await subscriptionRepository.findByUserId(userId);
        const plan = subscription?.plan || 'free';
        const tier = plan === 'enterprise' ? 'enterprise' : (plan === 'pro' ? 'pro' : (subscription ? 'authenticated' : 'free'));
        const dailyLimit = DAILY_VOTE_LIMITS[tier] ?? DAILY_VOTE_LIMITS.free;

        // Check existing vote first — switching/toggling doesn't count as a new vote
        const existing = await promptRepository.findVote(promptId, userId);

        if (!existing && dailyLimit !== -1) {
            // Only enforce limit for NEW votes (not toggles/switches)
            const todayVotes = await promptRepository.countUserVotesToday(userId);
            if (todayVotes >= dailyLimit) {
                throw new ValidationError(
                    `Daily vote limit reached (${dailyLimit}/${dailyLimit}). ` +
                    (tier === 'free' ? 'Upgrade to Pro for 50 votes/day.' : 'Limit resets in 24 hours.')
                );
            }
        }

        // Vote weight based on plan
        const weight = (plan === 'pro' || plan === 'enterprise') ? 2 : 1;

        let scoreImpact = 0;

        if (existing) {
            if (existing.value === value) {
                // Cancel current vote (Toggle)
                scoreImpact = -(existing.value * existing.weight);
                await promptRepository.deleteVote(existing.id);
            } else {
                // Switch vote (e.g. Up -> Down)
                scoreImpact = (value * weight) - (existing.value * existing.weight);
                await promptRepository.updateVote(existing.id, { value, weight });
            }
        } else {
            // New vote
            scoreImpact = value * weight;
            await promptRepository.createVote({ promptId, userId, value, weight });
        }

        // Update net score on prompt
        const updatedPrompt = await promptRepository.updateScore(promptId, scoreImpact);

        const finalVote = existing && existing.value === value ? 0 : value;

        // Analytics: track vote
        analytics.voteSubmitted(userId, promptId, finalVote, updatedPrompt.score);

        // Return remaining daily votes
        const votesUsedToday = await promptRepository.countUserVotesToday(userId);

        return {
            score: updatedPrompt.score,
            vote: finalVote,
            weightUsed: weight,
            dailyVotesUsed: votesUsedToday,
            dailyVoteLimit: dailyLimit === -1 ? 'unlimited' : dailyLimit
        };
    }

    /**
     * Toggle bookmark on a prompt
     */
    async toggleBookmark(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const existing = await promptRepository.findBookmark(promptId, userId);

        if (existing) {
            await promptRepository.deleteBookmark(existing.id);
            await promptRepository.updateBookmarkCount(promptId, false);
            return { bookmarked: false };
        } else {
            await promptRepository.createBookmark({ promptId, userId });
            await promptRepository.updateBookmarkCount(promptId, true);
            return { bookmarked: true };
        }
    }
}

export default new PromptService();
