import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import bountyController from '../controllers/bounty.controller.js';

const router = express.Router();

/**
 * @route   GET /api/bounties
 * @desc    List bounties
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(bountyController.getAll.bind(bountyController)));

/**
 * @route   POST /api/bounties
 * @desc    Create a bounty
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(bountyController.create.bind(bountyController)));

/**
 * @route   GET /api/bounties/:id
 * @desc    Get bounty details
 * @access  Public
 */
router.get('/:id', optionalAuth, asyncHandler(bountyController.getById.bind(bountyController)));

/**
 * @route   POST /api/bounties/:id/submit
 * @desc    Submit a solution to a bounty
 * @access  Private
 */
router.post('/:id/submit', authenticate, asyncHandler(bountyController.submitSolution.bind(bountyController)));

/**
 * @route   POST /api/bounties/:id/award
 * @desc    Award bounty to a submission
 * @access  Private (bounty creator only)
 */
router.post('/:id/award', authenticate, asyncHandler(bountyController.award.bind(bountyController)));

export default router;
