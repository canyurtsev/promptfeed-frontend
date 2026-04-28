import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkAiUsageLimit } from '../middleware/premium.middleware.js';
import { playgroundLimiter } from '../middleware/rateLimiter.js';
import playgroundController from '../controllers/playground.controller.js';

const router = express.Router();

/**
 * @route POST /api/playground/run
 * @desc  Run a prompt through the AI playground
 * @access Private — rate limited + daily usage limit enforced
 */
router.post('/run', authenticate, playgroundLimiter, checkAiUsageLimit, playgroundController.run.bind(playgroundController));

/**
 * @route POST /api/playground/optimize
 * @desc  AI-optimize a prompt
 * @access Private — rate limited + daily usage limit enforced (H-04 fix)
 */
router.post('/optimize', authenticate, playgroundLimiter, checkAiUsageLimit, playgroundController.improve.bind(playgroundController));


export default router;
