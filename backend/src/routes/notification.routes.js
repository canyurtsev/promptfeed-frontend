import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Stub for notifications - Placeholder to prevent crash
router.get('/', authenticate, (req, res) => {
    res.json({ success: true, data: [] });
});

router.post('/read-all', authenticate, (req, res) => {
    res.json({ success: true, message: 'All notifications marked as read' });
});

export default router;
