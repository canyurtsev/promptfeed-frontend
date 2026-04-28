import aiService from './ai.service.js';
import { logger } from '../utils/logger.js';

class PromptScoreService {
    async evaluatePrompt(promptText, model = 'gpt-4o') {
        if (!promptText || promptText.trim().length === 0) {
            throw new Error('Prompt text cannot be empty');
        }

        // Try to get AI evaluation
        try {
            const aiEvaluation = await this.getAIEvaluation(promptText, model);
            if (aiEvaluation) return aiEvaluation;
        } catch (error) {
            logger.error('AI evaluation failed, falling back to heuristic scoring:', error.message);
        }

        // Fallback to heuristic evaluation
        return this.getHeuristicEvaluation(promptText, model);
    }

    async getAIEvaluation(promptText, model) {
        const evaluationPrompt = `
You are an expert Prompt Engineer. Analyze the following user prompt FOR MODEL: ${model}.
Return ONLY valid JSON with no markdown formatting.

Format:
{
  "score": <total score 0-100 integer>,
  "breakdown": {
    "clarity": <0-100 integer>,
    "specificity": <0-100 integer>,
    "structure": <0-100 integer>,
    "token_efficiency": <0-100 integer>,
    "output_reliability": <0-100 integer>
  },
  "feedback": [
    "<suggestion 1>",
    "<suggestion 2>"
  ]
}

PROMPT TO ANALYZE:
"""
${promptText}
"""
`;

        // We use typical model naming for internal routing
        const response = await aiService.testPrompt(evaluationPrompt, '', model);

        // If aiService returns a mock response, throw to use heuristic
        if (response.isMock) {
            throw new Error('AI Service is in Mock mode');
        }

        let resultText = response.response;
        if (!resultText) throw new Error('Empty AI response');

        // Clean markdown blocks if AI decided to include them
        resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(resultText);
            
            // Basic validation
            if (parsed.score !== undefined && parsed.breakdown && Array.isArray(parsed.feedback)) {
                return parsed;
            }
        } catch (e) {
            logger.error('Failed to parse AI score JSON:', resultText);
        }
        
        throw new Error('Invalid AI JSON response');
    }

    getHeuristicEvaluation(promptText, model) {
        const text = promptText.toLowerCase();
        let score = 50;
        const breakdown = { clarity: 50, specificity: 50, structure: 50, token_efficiency: 50, output_reliability: 50 };
        const feedback = [];

        // 1. Length check (Specificity & Tokens)
        const words = text.split(/\s+/).length;
        if (words < 10) {
            feedback.push('Prompt is very short. Add more context or specific instructions.');
            breakdown.specificity = 30;
            breakdown.clarity = 40;
            breakdown.token_efficiency = 100;
        } else if (words > 500) {
            feedback.push('Prompt is very long. Consider removing redundant information to save tokens.');
            breakdown.token_efficiency = 40;
            breakdown.specificity = 90;
        } else {
            breakdown.specificity = 85;
            breakdown.token_efficiency = 85;
            score += 15;
        }

        // 2. Structure check
        const hasStructure = /task|context|output|constraints|format|example/i.test(text) || text.includes('#') || text.includes('-');
        if (hasStructure) {
            breakdown.structure = 90;
            breakdown.clarity += 20;
            score += 15;
            feedback.push('Good use of structure and headers.');
        } else {
            breakdown.structure = 40;
            feedback.push('Consider using structured sections (e.g. # Task, # Constraints, # Output Format).');
        }

        // 3. Clarity & Reliability
        if (text.includes('always') || text.includes('must') || text.includes('do not')) {
            breakdown.output_reliability = 85;
            score += 10;
        } else {
            breakdown.output_reliability = 60;
            feedback.push('Add strong constraint words (like "must", "always", or "do not") to improve reliability.');
        }

        // 4. MODEL SPECIFIC LOGIC FOR COMPARISON
        if (model.includes('claude')) {
            if (!text.includes('<') || !text.includes('>')) {
                feedback.push('🤖 Claude 3.5 Specific: Claude follows XML tags perfectly. Use <instructions> or <context> tags to boost reliability!');
                breakdown.structure -= 10;
                breakdown.output_reliability -= 5;
            } else {
                feedback.push('🤖 Claude 3.5 Specific: Great job using XML-like structure. Claude loves this!');
                breakdown.structure += 10;
            }
        } else if (model.includes('gemini')) {
            feedback.push('🧠 Gemini Specific: Gemini 1.5 Pro performs exceptionally well on long contexts. You can afford to add much more background info.');
            breakdown.token_efficiency = Math.min(100, breakdown.token_efficiency + 15);
        } else if (model.includes('llama')) {
            feedback.push('🦙 Llama 3 Specific: Open weights models require very direct, explicit system prompts. Avoid subtle implications.');
            if (breakdown.clarity < 80) breakdown.clarity -= 10;
        } else {
            feedback.push('✨ GPT-4o Specific: GPT-4o responds well to persona adoption ("You are an expert...").');
            if (!text.includes('expert') && !text.includes('act as') && !text.includes('you are')) {
                breakdown.reliability -= 5;
            } else {
                breakdown.reliability += 10;
            }
        }

        // Calculate final score based on requested weights:
        // clarity: 20%, specificity: 20%, structure: 20%, token_efficiency: 15%, output_reliability: 25%
        score = Math.floor(
            (breakdown.clarity * 0.20) +
            (breakdown.specificity * 0.20) +
            (breakdown.structure * 0.20) +
            (breakdown.token_efficiency * 0.15) +
            (breakdown.output_reliability * 0.25)
        );

        return {
            score: Math.min(Math.max(score, 0), 100),
            breakdown,
            feedback: [...new Set(feedback)]
        };
    }
}

export default new PromptScoreService();
