import { logger } from '../utils/logger.js';
import aiCacheRepository from '../repositories/aiCache.repository.js';
import aiLogRepository from '../repositories/aiLog.repository.js';
import subscriptionService from './subscription.service.js';
import { generatePromptHash, calculateSimilarity, optimizeTokens, normalizePrompt } from '../utils/ai.utils.js';

class AIService {
    /**
     * Main Orchestra for AI Playground runs
     */
    async runPlayground(userId, prompt, userInput, model, options = {}) {
        const fullPrompt = `${prompt}\n\n[USER INPUT]:\n${userInput}`;
        const optimizedPrompt = optimizeTokens(fullPrompt);
        const promptHash = generatePromptHash(optimizedPrompt);

        // 1. Subscription & Rolling Window Check
        const subscription = await subscriptionService.getSubscription(userId);
        const usageLast24h = await aiLogRepository.countInLast24Hours(userId);

        const planLimits = subscription.details.limits || { maxDailyRuns: 5 };
        const dailyLimit = planLimits.maxDailyRuns || 10; // Default limit

        const avgTokenCost = 0.00002; // Roughly $20 per 1M tokens combined avg
        const startTime = Date.now();

        // 2. Cache Logic (Exact Match First)
        const exactMatch = await aiCacheRepository.findByHash(promptHash);
        if (exactMatch) {
            await aiCacheRepository.incrementHit(exactMatch.id);
            await this.logRun(userId, optimizedPrompt, model, 0, 'cache_exact');
            const latencyMs = Date.now() - startTime;
            return {
                response: exactMatch.response,
                source: 'cache_exact',
                tokens: exactMatch.tokensUsed,
                costSaved: parseFloat((exactMatch.tokensUsed * avgTokenCost).toFixed(4)),
                latencyMs,
                isMatch: true
            };
        }

        // 3. Similarity Check (Global Cache)
        const latestCaches = await aiCacheRepository.findManyLatest(500);
        let bestMatch = null;
        let lowestTokenMatch = null;
        let highestSimilarity = 0;

        for (const cache of latestCaches) {
            const sim = calculateSimilarity(optimizedPrompt, cache.promptText);
            if (sim > 0.85) {
                if (sim > highestSimilarity) {
                    highestSimilarity = sim;
                    bestMatch = cache;
                }
                if (!lowestTokenMatch || cache.tokensUsed < lowestTokenMatch.tokensUsed) {
                    lowestTokenMatch = cache;
                }
            }
        }

        if (bestMatch) {
            await this.logRun(userId, optimizedPrompt, model, 0, 'cache_similarity');
            const latencyMs = Date.now() - startTime;
            return {
                bestMatch: {
                    response: bestMatch.response,
                    similarity: Math.round(highestSimilarity * 100),
                    tokens: bestMatch.tokensUsed
                },
                ecoMatch: lowestTokenMatch ? {
                    response: lowestTokenMatch.response,
                    tokens: lowestTokenMatch.tokensUsed
                } : null,
                source: 'cache_similarity',
                costSaved: parseFloat((bestMatch.tokensUsed * avgTokenCost * highestSimilarity).toFixed(4)),
                latencyMs,
                isMatch: true
            };
        }

        // 4. Real API Call (Already passed limit check via middleware)
        const result = await this.executeRealAPI(optimizedPrompt, model, options);
        const latencyMs = Date.now() - startTime;

        // 6. Save to Cache & Log
        if (!result.error) {
            await aiCacheRepository.create({
                promptHash,
                promptText: optimizedPrompt,
                model,
                response: result.response,
                tokensUsed: result.tokens || 0
            });
            await this.logRun(userId, optimizedPrompt, model, result.tokens || 0, 'api');
        }

        return {
            ...result,
            source: 'api',
            latencyMs,
            costSaved: 0
        };
    }

    /**
     * Prompt Improve Mode (Optional Smart Feature)
     */
    async improvePrompt(text) {
        const improverPrompt = "As an AI prompt engineer, refine and improve the following prompt to be more specific, structured and effective. Return ONLY the refined prompt text.\n\nPROMPT:\n";
        return this.executeRealAPI(improverPrompt + text, 'gpt-4o', { max_tokens: 500 });
    }

    /**
     * Helper to call LLMs
     */
    async executeRealAPI(prompt, model, options = {}) {
        const openaiKey = process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        // Truth Mode: Throw Error instead of returning mock response
        if (!openaiKey && !anthropicKey) {
            throw new Error(`API keys missing for ${model}. Add API keys to .env to execute real runs.`);
        }

        try {
            if (model.includes('gpt') || model.includes('openai')) {
                return await this.callOpenAI(prompt, openaiKey, options);
            } else if (model.includes('claude') || model.includes('anthropic')) {
                return await this.callAnthropic(prompt, anthropicKey, options);
            }
            return { error: 'Model not supported for real API execution' };
        } catch (error) {
            logger.error(`AI API Execution Error (${model}):`, error);
            return { error: 'API_ERROR', message: error.message };
        }
    }

    async logRun(userId, prompt, model, tokens, source) {
        try {
            await aiLogRepository.create({
                userId,
                model,
                tokens,
                source,
                cacheHit: source.startsWith('cache')
            });
        } catch (err) {
            logger.error('Logging AI Run failed:', err);
        }
    }

    // --- Provider Implementations ---

    async callOpenAI(prompt, key, options) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                ...options
            })
        });
        const data = await response.json();
        if (!response.ok) {
            return { error: 'OPENAI_API_ERROR', message: data.error?.message || response.statusText };
        }
        if (!data.choices || !data.choices[0]) {
            return { error: 'MALFORMED_RESPONSE', message: 'No response from OpenAI' };
        }
        return {
            response: data.choices[0].message.content,
            tokens: data.usage?.total_tokens || 0,
            model: 'gpt-4o'
        };
    }

    async callAnthropic(prompt, key, options) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: options.max_tokens || 1024,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        if (!response.ok) {
            return { error: 'ANTHROPIC_API_ERROR', message: data.error?.message || response.statusText };
        }
        if (!data.content || !data.content[0]) {
            return { error: 'MALFORMED_RESPONSE', message: 'No response from Anthropic' };
        }
        return {
            response: data.content[0].text,
            tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            model: 'claude-3-5-sonnet'
        };
    }


}

export default new AIService();

