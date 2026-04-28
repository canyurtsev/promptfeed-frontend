import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import skillController from '../controllers/skill.controller.js';

const router = express.Router();

/**
 * @route GET /api/skills
 */
router.get('/', skillController.getAll.bind(skillController));

/**
 * @route GET /api/skills/:id
 */
router.get('/:id', skillController.getById.bind(skillController));

/**
 * @route POST /api/skills
 */
router.post('/', authenticate, skillController.create.bind(skillController));

export default router;
