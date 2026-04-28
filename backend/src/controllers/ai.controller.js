import aiService from '../services/ai.service.js';
import { logger } from '../utils/logger.js';

/**
 * AI Controller
 * Handles HTTP request/response for AI playground endpoints
 */
class AIController {
    async testPrompt(req, res, next) {
        try {
            const { prompt, userInput, model } = req.body;

            if (!prompt || !userInput || !model) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Prompt, userInput, and model are required.'
                });
            }

            const result = await aiService.testPrompt(prompt, userInput, model);

            if (result.error && !result.isMock) {
                return res.status(500).json(result);
            }

            res.json(result);
        } catch (error) {
            logger.error('AI Controller Error:', error);
            next(error);
        }
    }
}

export default new AIController();
