import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import subscriptionController from '../controllers/subscription.controller.js';

const router = express.Router();

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all subscription plans
 * @access  Public
 */
router.get('/plans', asyncHandler(subscriptionController.getPlans.bind(subscriptionController)));

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current user's subscription
 * @access  Private
 */
router.get('/current', authenticate, asyncHandler(subscriptionController.getSubscription.bind(subscriptionController)));

/**
 * @route   POST /api/subscriptions/subscribe
 * @desc    Subscribe to a plan
 * @access  Private
 */
router.post('/subscribe', authenticate, asyncHandler(subscriptionController.subscribe.bind(subscriptionController)));

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel', authenticate, asyncHandler(subscriptionController.cancel.bind(subscriptionController)));

export default router;
