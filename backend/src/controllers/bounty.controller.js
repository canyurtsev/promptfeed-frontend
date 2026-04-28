import bountyService from '../services/bounty.service.js';
import { logger } from '../utils/logger.js';

class BountyController {
    async getAll(req, res, next) {
        try {
            const { status, category, sort, page, limit } = req.query;
            const result = await bountyService.getAll({ status, category, sort, page, limit });
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const bounty = await bountyService.getById(req.params.id);
            res.json({ success: true, data: bounty });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const bounty = await bountyService.create(req.user.id, req.body);
            res.status(201).json({ success: true, data: bounty });
        } catch (error) {
            next(error);
        }
    }

    async submitSolution(req, res, next) {
        try {
            const submission = await bountyService.submitSolution(req.params.id, req.user.id, req.body);
            res.status(201).json({ success: true, data: submission });
        } catch (error) {
            next(error);
        }
    }

    async award(req, res, next) {
        try {
            // Read submissionId from body if not in params
            const { submissionId } = req.body;
            const result = await bountyService.awardBounty(req.params.id, req.user.id, submissionId);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }
}

export default new BountyController();
