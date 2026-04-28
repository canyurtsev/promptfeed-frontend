import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import walletController from '../controllers/wallet.controller.js';

const router = express.Router();

/**
 * @route   GET /api/wallet
 * @desc    Get wallet balance and stats
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(walletController.getWallet.bind(walletController)));

/**
 * @route   POST /api/wallet/payout
 * @desc    Request a payout
 * @access  Private
 */
router.post('/payout', authenticate, asyncHandler(walletController.requestPayout.bind(walletController)));

export default router;
