import promptRepository from '../repositories/prompt.repository.js';
import subscriptionRepository from '../repositories/subscription.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
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

// ── Prompt Creation Limits ──
const FREE_PROMPT_LIMIT = 3;

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

        // Check user's subscription plan
        const subscription = await subscriptionRepository.findByUserId(userId);
        const plan = subscription?.plan?.toLowerCase() || 'free';

        // Free plan limit check
        if (plan === 'free') {
            const promptCount = await promptRepository.count({ userId });
            if (promptCount >= FREE_PROMPT_LIMIT) {
                const error = new Error('Free plan limit reached. Upgrade to Pro to publish more prompts.');
                error.statusCode = 403;
                throw error;
            }
        }

        // Auto-derive isPremium from price
        const createData = { ...validation.data };
        if (createData.price && parseFloat(createData.price) > 0) {
            createData.isPremium = true;
        }

        const prompt = await promptRepository.create({
            userId,
            ...createData
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
        let userSaves = {};
        if (currentUserId && prompts.length > 0) {
            const promptIds = prompts.map(p => p.id);
            const [votes, saves] = await Promise.all([
                promptRepository.findUserVotesForPrompts(currentUserId, promptIds),
                promptRepository.findUserSavesForPrompts(currentUserId, promptIds)
            ]);
            // userVote is 1 if voted, 0 if not
            votes.forEach(v => { userVotes[v.promptId] = 1; });
            saves.forEach(s => { userSaves[s.promptId] = true; });
        }

        // Attach userVote, normalize tags, remove internal scores
        const enrichedPrompts = prompts.map(p => {
            const { _hotScore, ...rest } = p;
            return {
                ...rest,
                userVote: userVotes[p.id] || 0,
                isSaved: Boolean(userSaves[p.id]),
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
        let isSaved = false;
        let isPurchased = false;

        if (currentUserId) {
            const [vote, bookmark, save, purchase] = await Promise.all([
                promptRepository.findVote(id, currentUserId),
                promptRepository.findBookmark(id, currentUserId),
                promptRepository.findSave(id, currentUserId),
                promptRepository.findPurchase(id, currentUserId)
            ]);

            if (vote) userVote = 1; // upvote-only: presence of record = voted
            if (bookmark) isBookmarked = true;
            if (save) isSaved = true;
            if (purchase) isPurchased = true;
        }

        return serializeDecimals({
            ...prompt,
            userVote,
            isBookmarked,
            isSaved,
            isPurchased
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
     * Toggle upvote on a prompt (upvote-only).
     * POST → add vote (if not already voted)
     * Calling upvote when already voted acts as a toggle (removes vote).
     */
    async upvote(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        // ── Daily Vote Limit Check (only for NEW votes) ──
        const existing = await promptRepository.findVote(promptId, userId);

        if (!existing) {
            const subscription = await subscriptionRepository.findByUserId(userId);
            const plan = subscription?.plan || 'free';
            const tier = plan === 'enterprise' ? 'enterprise' : (plan === 'pro' ? 'pro' : (subscription ? 'authenticated' : 'free'));
            const dailyLimit = DAILY_VOTE_LIMITS[tier] ?? DAILY_VOTE_LIMITS.free;

            if (dailyLimit !== -1) {
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

            // Create vote — score = count of upvotes, so increment by weight
            await promptRepository.createVote({ promptId, userId, weight });
            const updatedPrompt = await promptRepository.updateScore(promptId, weight);

            analytics.voteSubmitted(userId, promptId, 1, updatedPrompt.score);

            const votesUsedToday = await promptRepository.countUserVotesToday(userId);
            const subscription2 = await subscriptionRepository.findByUserId(userId);
            const plan2 = subscription2?.plan || 'free';
            const tier2 = plan2 === 'enterprise' ? 'enterprise' : (plan2 === 'pro' ? 'pro' : (subscription2 ? 'authenticated' : 'free'));
            const dailyLimit2 = DAILY_VOTE_LIMITS[tier2] ?? DAILY_VOTE_LIMITS.free;

            return {
                score: updatedPrompt.score,
                vote: 1,
                weightUsed: weight,
                dailyVotesUsed: votesUsedToday,
                dailyVoteLimit: dailyLimit2 === -1 ? 'unlimited' : dailyLimit2
            };
        } else {
            // Already voted — toggle off (remove)
            return this.removeUpvote(promptId, userId);
        }
    }

    /**
     * Remove upvote
     */
    async removeUpvote(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const existing = await promptRepository.findVote(promptId, userId);
        if (!existing) {
            return { score: Math.max(0, prompt.score), vote: 0, removed: false };
        }

        await promptRepository.deleteVote(existing.id);
        // Decrement by weight, floor at 0
        const updatedPrompt = await promptRepository.updateScore(promptId, -(existing.weight));

        analytics.voteSubmitted(userId, promptId, 0, updatedPrompt.score);

        return {
            score: updatedPrompt.score,
            vote: 0,
            removed: true
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

    async save(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        await promptRepository.createSave({ promptId, userId });
        return { saved: true };
    }

    async unsave(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        await promptRepository.deleteSave(promptId, userId);
        return { saved: false };
    }

    /**
     * Mock Buy System
     */
    async buy(promptId, userId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const priceVal = parseFloat(prompt.price || 0);
        const isPaid = prompt.isPremium || prompt.isPaid || priceVal > 0 || false;

        if (!isPaid) {
            return { success: true, message: 'Prompt is free', alreadyPurchased: false };
        }

        if (prompt.userId === userId) {
            throw new ForbiddenError('You cannot buy your own prompt');
        }

        const existingPurchase = await promptRepository.findPurchase(promptId, userId);
        if (existingPurchase) {
            return { success: true, message: 'Already purchased', alreadyPurchased: true };
        }

        const purchase = await promptRepository.createPurchase({
            userId,
            promptId,
            pricePaid: prompt.price || 0
        });

        await walletRepository.creditBalance(prompt.userId, priceVal);

        analytics.promptPurchased && analytics.promptPurchased(userId, promptId, prompt.price);

        return { success: true, message: 'Purchase successful', data: purchase };
    }

    /**
     * Get marketplace prompts (isPremium = true)
     * Returns title, price, author (username), score
     */
    async getMarketplace({ search, tag, sort = 'trending', page = 1, limit = 24, priceFilter } = {}) {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let where = {};

        // Apply price filter
        if (priceFilter === 'free') {
            where.OR = [
                { isPremium: false },
                { price: 0 }
            ];
        } else if (priceFilter === 'premium') {
            where.OR = [
                { isPremium: true },
                { price: { gt: 0 } }
            ];
        } else {
            // Default: premium only
            where.isPremium = true;
        }

        // Handle search
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Handle tag/category filter
        if (tag) {
            const tagFilter = {
                OR: [
                    { category: { contains: tag, mode: 'insensitive' } },
                    { tags: { contains: tag, mode: 'insensitive' } }
                ]
            };
            if (where.OR) {
                const searchFilter = { OR: where.OR };
                delete where.OR;
                where.AND = [searchFilter, tagFilter];
            } else {
                where.AND = [tagFilter];
            }
        }

        // Handle sorting
        let orderBy = { score: 'desc' }; // default 'trending'
        if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        } else if (sort === 'price_low') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_high') {
            orderBy = { price: 'desc' };
        }

        const [prompts, total] = await Promise.all([
            promptRepository.findAll({
                where,
                orderBy,
                skip,
                take
            }),
            promptRepository.count(where)
        ]);

        const result = prompts.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: p.price,
            isPaid: true,
            score: p.score,
            category: p.category,
            tags: typeof p.tags === 'string'
                ? p.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
                : (p.tags || []),
            createdAt: p.createdAt,
            user: p.user
        }));

        return serializeDecimals({
            prompts: result,
            pagination: {
                page: parseInt(page),
                limit: take,
                total,
                totalPages: Math.ceil(total / take)
            }
        });
    }

    /**
     * Run a prompt (Mock Execution)
     */
    async runPrompt(promptId, userId, input) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const isPaid = prompt.isPremium || prompt.price > 0;
        
        if (isPaid && prompt.userId !== userId) {
            const purchase = await promptRepository.findPurchase(promptId, userId);
            if (!purchase) {
                throw new ForbiddenError('You must purchase this prompt to run it.');
            }
        }

        // Mock output logic
        const safeInput = typeof input === 'string' ? input : JSON.stringify(input);
        const first100 = safeInput.substring(0, 100);
        const output = `AI response for: ${first100}`;

        const execution = await promptRepository.createExecution({
            promptId,
            userId,
            input: safeInput,
            output
        });

        return execution;
    }
}

export default new PromptService();
