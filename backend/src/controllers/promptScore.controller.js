import promptScoreService from '../services/promptScore.service.js';

class PromptScoreController {
    /**
     * Evaluate a prompt and return a weighted score + breakdown
     */
    async scorePrompt(req, res, next) {
        try {
            const { prompt, model } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ success: false, message: 'Prompt text is required' });
            }

            const evaluation = await promptScoreService.evaluatePrompt(prompt, model || 'gpt-4o');
            
            res.json({
                success: true,
                data: evaluation
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new PromptScoreController();
