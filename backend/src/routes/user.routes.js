import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import userController from '../controllers/user.controller.js';

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(userController.getMe.bind(userController)));

/**
 * @route   GET /api/users/me/bookmarks
 * @desc    Get current user's bookmarks
 * @access  Private
 */
router.get('/me/bookmarks', authenticate, asyncHandler(userController.getBookmarks.bind(userController)));

/**
 * @route   GET /api/users/me/saved-prompts
 * @desc    Get current user's saved prompts
 * @access  Private
 */
router.get('/me/saved-prompts', authenticate, asyncHandler(userController.getSavedPrompts.bind(userController)));

/**
 * @route   GET /api/users/me/prompts
 * @desc    Get current user's created prompts
 * @access  Private
 */
router.get('/me/prompts', authenticate, asyncHandler(userController.getMyPrompts.bind(userController)));

/**
 * @route   PUT /api/users/me
 * @desc    Update current user
 * @access  Private
 */
router.put('/me', authenticate, asyncHandler(userController.updateMe.bind(userController)));

/**
 * @route   GET /api/users/me/purchased-prompts
 * @desc    Get current user's purchased prompts
 * @access  Private
 */
router.get('/me/purchased-prompts', authenticate, asyncHandler(userController.getPurchasedPrompts.bind(userController)));

/**
 * @route   GET /api/users/me/wallet
 * @desc    Get current user's wallet
 * @access  Private
 */
router.get('/me/wallet', authenticate, asyncHandler(userController.getWallet.bind(userController)));

/**
 * @route   GET /api/users/me/earnings
 * @desc    Get current user's earnings (creator sales)
 * @access  Private
 */
router.get('/me/earnings', authenticate, asyncHandler(userController.getEarnings.bind(userController)));

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(userController.getById.bind(userController)));

export default router;
