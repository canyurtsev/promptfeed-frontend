import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import marketplaceController from '../controllers/marketplace.controller.js';

import { purchaseLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   GET /api/marketplace/products
 * @desc    List marketplace products
 * @access  Public
 */
router.get('/products', optionalAuth, asyncHandler(marketplaceController.listProducts.bind(marketplaceController)));

/**
 * @route   GET /api/marketplace/products/:id
 * @desc    Get product details
 * @access  Public
 */
router.get('/products/:id', optionalAuth, asyncHandler(marketplaceController.getProduct.bind(marketplaceController)));

/**
 * @route   POST /api/marketplace/products
 * @desc    Create a product (list prompt for sale)
 * @access  Private
 */
router.post('/products', authenticate, asyncHandler(marketplaceController.createProduct.bind(marketplaceController)));

/**
 * @route   POST /api/marketplace/purchase
 * @desc    Purchase a product
 * @access  Private
 */
router.post('/purchase', authenticate, purchaseLimiter, asyncHandler(marketplaceController.purchase.bind(marketplaceController)));

/**
 * @route   GET /api/marketplace/products/:id/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get('/products/:id/reviews', asyncHandler(marketplaceController.getReviews.bind(marketplaceController)));

/**
 * @route   POST /api/marketplace/products/:id/reviews
 * @desc    Write a product review
 * @access  Private
 */
router.post('/products/:id/reviews', authenticate, asyncHandler(marketplaceController.createReview.bind(marketplaceController)));

/**
 * @route   DELETE /api/marketplace/reviews/:id
 * @desc    Delete a review
 * @access  Private (owner only)
 */
router.delete('/reviews/:id', authenticate, asyncHandler(marketplaceController.deleteReview.bind(marketplaceController)));

export default router;
