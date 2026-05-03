import promptService from '../services/prompt.service.js';

class PromptController {
    /**
     * Get all prompts with filters
     */
    async getAll(req, res) {
        const { category, tag, sort, search, page, limit } = req.query;
        const userId = req.user?.id || null;
        const result = await promptService.getAll({ category, tag, sort, search, page, limit }, userId);
        res.json({ success: true, data: result });
    }

    /**
     * Get prompt by ID with user state (vote, bookmark)
     */
    async getById(req, res) {
        const { id } = req.params;
        const userId = req.user?.id;
        const prompt = await promptService.getById(id, userId);
        res.json({ success: true, data: prompt });
    }

    /**
     * Create prompt
     */
    async create(req, res) {
        const userId = req.user.id;
        const prompt = await promptService.create(userId, req.body);
        res.status(201).json({ success: true, data: prompt });
    }

    /**
     * Update prompt
     */
    async update(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const prompt = await promptService.update(id, userId, req.body);
        res.json({ success: true, data: prompt });
    }

    /**
     * Delete prompt
     */
    async delete(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.delete(id, userId);
        res.json({ success: true, ...result });
    }

    /**
     * Vote on prompt
     */
    async vote(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const { value } = req.body;
        const result = await promptService.vote(id, userId, value);
        res.json({ success: true, data: result });
    }

    /**
     * Upvote prompt
     */
    async upvote(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.upvote(id, userId);
        res.json({ success: true, data: result });
    }

    /**
     * Remove upvote
     */
    async removeUpvote(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.removeUpvote(id, userId);
        res.json({ success: true, data: result });
    }

    /**
     * Bookmark prompt
     */
    async bookmark(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.toggleBookmark(id, userId);
        res.json({ success: true, data: result });
    }

    /**
     * Save prompt
     */
    async save(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.save(id, userId);
        res.status(201).json({ success: true, data: result });
    }

    /**
     * Unsave prompt
     */
    async unsave(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const result = await promptService.unsave(id, userId);
        res.json({ success: true, data: result });
    }
}

export default new PromptController();
