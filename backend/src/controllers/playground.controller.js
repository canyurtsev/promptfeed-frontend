import aiService from '../services/ai.service.js';
import { logger } from '../utils/logger.js';

class PlaygroundController {
    /**
     * Run prompt with global cache & similarity check
     */
    async run(req, res, next) {
        try {
            const { prompt, userInput, model, options } = req.body;
            const userId = req.user.id;

            if (!prompt) {
                return res.status(400).json({ success: false, message: 'Prompt is required' });
            }

            const result = await aiService.runPlayground(userId, prompt, userInput, model || 'gpt-4o', options || {});
            
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error('Playground Run Error:', error);
            next(error);
        }
    }

    /**
     * Improve/Optimize prompt
     */
    async improve(req, res, next) {
        try {
            const { prompt, model } = req.body;
            if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

            const result = await aiService.improvePrompt(prompt, model || 'gpt-4o');
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

export default new PlaygroundController();
