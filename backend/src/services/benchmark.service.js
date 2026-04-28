import aiService from './ai.service.js';
import promptRepository from '../repositories/prompt.repository.js';
import { NotFoundError } from '../middleware/error.middleware.js';

/**
 * Benchmark Service
 * Compares prompt performance across multiple models
 */
class BenchmarkService {
    async runComparison(promptId, userId, testInput = null) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const models = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro'];
        
        const results = await Promise.all(models.map(async (model) => {
            try {
                const startTime = Date.now();
                const response = await aiService.executeRealAPI(prompt.content, model, { 
                    max_tokens: 200, 
                    temperature: 0.7 
                });
                const latency = Date.now() - startTime;

                return {
                    model,
                    response: response.response,
                    tokens: response.tokens || 0,
                    latency,
                    status: response.error ? 'error' : 'success',
                    ...(response.error && { error: response.message || response.error })
                };
            } catch (err) {
                return {
                    model,
                    error: err.message,
                    status: 'error'
                };
            }
        }));

        return {
            promptId,
            results
        };
    }
}

export default new BenchmarkService();
