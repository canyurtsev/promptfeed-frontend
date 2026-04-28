import express from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import promptController from '../controllers/prompt.controller.js';
import promptScoreController from '../controllers/promptScore.controller.js';
import commentService from '../services/comment.service.js';
import versionService from '../services/version.service.js';
import benchmarkService from '../services/benchmark.service.js';

const router = express.Router();

/**
 * @route   GET /api/prompts
 * @desc    List prompts with filtering
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(promptController.getAll.bind(promptController)));

/**
 * @route   POST /api/prompts
 * @desc    Create a new prompt
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(promptController.create.bind(promptController)));

/**
 * @route   POST /api/prompts/score
 * @desc    Get AI heuristic score for a prompt
 * @access  Public (or OptionalAuth)
 */
router.post('/score', asyncHandler(promptScoreController.scorePrompt.bind(promptScoreController)));

/**
 * @route   GET /api/prompts/:id
 * @desc    Get prompt details
 * @access  Public
 */
router.get('/:id', optionalAuth, asyncHandler(promptController.getById.bind(promptController)));

/**
 * @route   PUT /api/prompts/:id
 * @desc    Update prompt
 * @access  Private (owner only)
 */
router.put('/:id', authenticate, asyncHandler(promptController.update.bind(promptController)));

/**
 * @route   DELETE /api/prompts/:id
 * @desc    Delete prompt
 * @access  Private (owner only)
 */
router.delete('/:id', authenticate, asyncHandler(promptController.delete.bind(promptController)));

/**
 * @route   POST /api/prompts/:id/vote
 * @desc    Vote on a prompt (Up/Down)
 * @access  Private
 */
router.post('/:id/vote', authenticate, asyncHandler(promptController.vote.bind(promptController)));

/**
 * @route   POST /api/prompts/:id/bookmark
 * @desc    Toggle bookmark on a prompt
 * @access  Private
 */
router.post('/:id/bookmark', authenticate, asyncHandler(promptController.bookmark.bind(promptController)));

// ── Comment Endpoints ──

/**
 * @route   POST /api/prompts/:id/comments
 * @desc    Add a comment to a prompt
 * @access  Private
 */
router.post('/:id/comments', authenticate, asyncHandler(async (req, res) => {
    const { content, parentId } = req.body;
    const comment = await commentService.create(req.params.id, req.user.id, content, parentId);

    res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
    });
}));

/**
 * @route   GET /api/prompts/:id/comments
 * @desc    Get comments for a prompt
 * @access  Public
 */
router.get('/:id/comments', asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await commentService.getByPrompt(req.params.id, { page, limit });

    res.json({
        success: true,
        data: result
    });
}));

// ── Version Endpoints ──

/**
 * @route   POST /api/prompts/:id/versions
 * @desc    Create a new version of a prompt
 * @access  Private (owner only)
 */
router.post('/:id/versions', authenticate, asyncHandler(async (req, res) => {
    const { content, changelog } = req.body;
    const version = await versionService.create(req.params.id, req.user.id, content, changelog);

    res.status(201).json({
        success: true,
        message: 'Version created successfully',
        data: version
    });
}));

/**
 * @route   GET /api/prompts/:id/versions
 * @desc    Get all versions of a prompt
 * @access  Public
 */
router.get('/:id/versions', asyncHandler(async (req, res) => {
    const versions = await versionService.getByPrompt(req.params.id);

    res.json({
        success: true,
        data: versions
    });
}));

/**
 * @route   POST /api/prompts/versions/:id/restore
 * @desc    Restore a version
 */
router.post('/versions/:id/restore', authenticate, asyncHandler(async (req, res) => {
    const result = await versionService.restore(req.params.id, req.user.id);
    res.json({ success: true, data: result });
}));

/**
 * @route   POST /api/prompts/:id/benchmark
 * @desc    Compare prompt across models
 */
router.post('/:id/benchmark', authenticate, asyncHandler(async (req, res) => {
    const result = await benchmarkService.runComparison(req.params.id, req.user.id);
    res.json({ success: true, data: result });
}));

export default router;
