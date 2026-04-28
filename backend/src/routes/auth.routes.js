import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import authController from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public — rate limited (10 failed attempts / 15 min)
 */
router.post('/register', authRateLimiter, asyncHandler(authController.register.bind(authController)));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public — rate limited (10 failed attempts / 15 min)
 */
router.post('/login', authRateLimiter, asyncHandler(authController.login.bind(authController)));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', asyncHandler(authController.refresh.bind(authController)));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(authController.getMe.bind(authController)));

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/google', asyncHandler(authController.initiateGoogle.bind(authController)));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', asyncHandler(authController.handleGoogleCallback.bind(authController)));

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
router.get('/github', asyncHandler(authController.initiateGithub.bind(authController)));

/**
 * @route   GET /api/auth/github/callback
 * @desc    Handle GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback', asyncHandler(authController.handleGithubCallback.bind(authController)));

/**
 * @route   POST /api/auth/oauth/exchange
 * @desc    Exchange OAuth code for JWT tokens
 * @access  Public
 */
router.post('/oauth/exchange', asyncHandler(authController.exchangeOAuthCode.bind(authController)));

export default router;
