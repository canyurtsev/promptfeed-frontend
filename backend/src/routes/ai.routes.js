import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiRateLimiter } from '../middleware/rateLimit.middleware.js';
import aiController from '../controllers/ai.controller.js';

const router = express.Router();

/**
 * @route POST /api/ai/test
 * @desc Test a prompt with user input
 * @access Private (authenticated users only) — rate limited
 */
router.post('/test', authenticate, aiRateLimiter, aiController.testPrompt.bind(aiController));

export default router;
