import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import paymentController from '../controllers/payment.controller.js';

const router = express.Router();

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create a Stripe PaymentIntent
 * @access  Private
 */
router.post('/create-intent', authenticate, asyncHandler(paymentController.createPaymentIntent.bind(paymentController)));

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  TEMPORARILY DISABLED — payment system not active
 * @todo    Re-enable with stripe.webhooks.constructEvent() signature verification
 */
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    console.warn('[WEBHOOK] Stripe webhook received but processing is DISABLED. No database changes made.');
    res.status(200).json({ received: true, mode: 'disabled' });
});

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user transaction history
 * @access  Private
 */
router.get('/transactions', authenticate, asyncHandler(paymentController.getTransactions.bind(paymentController)));

export default router;
