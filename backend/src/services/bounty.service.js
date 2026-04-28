import bountyRepository from '../repositories/bounty.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
import promptRepository from '../repositories/prompt.repository.js';
import { validate, createBountySchema, submitSolutionSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';

/**
 * Bounty Service
 * Handles bounty creation, solution submissions, and awarding
 */
class BountyService {
    /**
     * Create a new bounty
     */
    async create(userId, data) {
        const validation = validate(createBountySchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        // Check wallet balance for Escrow
        const wallet = await walletRepository.findByUserId(userId);
        if (!wallet || wallet.balance < validation.data.amount) {
            throw new ValidationError('Insufficient wallet balance to secure this bounty in escrow');
        }

        // Deduct from wallet instantly and securely hold in Escrow
        await walletRepository.debitBalance(userId, validation.data.amount);

        const bounty = await bountyRepository.create({
            creatorId: userId,
            ...validation.data,
            status: 'open',
            escrowStatus: 'HELD',
            escrowAmount: validation.data.amount
        });

        return bounty;
    }

    /**
     * List bounties with filtering
     */
    async getAll({ status, category, sort = 'latest', page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const where = {};

        if (status) where.status = status;
        if (category) where.category = category;

        let orderBy;
        switch (sort) {
            case 'amount':
                orderBy = { amount: 'desc' };
                break;
            case 'deadline':
                orderBy = { deadline: 'asc' };
                break;
            case 'latest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        const [bounties, total] = await Promise.all([
            bountyRepository.findAll({ where, orderBy, skip, take: parseInt(limit) }),
            bountyRepository.count(where)
        ]);

        return {
            bounties,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get bounty details with submissions
     */
    async getById(id) {
        const bounty = await bountyRepository.findById(id);
        if (!bounty) throw new NotFoundError('Bounty not found');
        return bounty;
    }

    /**
     * Submit a solution to a bounty
     */
    async submitSolution(bountyId, userId, data) {
        const validation = validate(submitSolutionSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const bounty = await bountyRepository.findByIdSimple(bountyId);
        if (!bounty) throw new NotFoundError('Bounty not found');
        if (bounty.status !== 'open') throw new ValidationError('This bounty is no longer accepting submissions');
        if (bounty.creatorId === userId) throw new ValidationError('You cannot submit to your own bounty');

        // Check deadline
        if (bounty.deadline && new Date(bounty.deadline) < new Date()) {
            throw new ValidationError('This bounty has passed its deadline');
        }

        // Check if user already submitted
        const existingSubmission = await bountyRepository.findSubmissionByUser(bountyId, userId);
        if (existingSubmission) throw new ValidationError('You have already submitted a solution');

        // Verify prompt exists and belongs to user
        const prompt = await promptRepository.findByIdSimple(validation.data.promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');
        if (prompt.userId !== userId) throw new ForbiddenError('You can only submit your own prompts');

        const submission = await bountyRepository.createSubmission({
            bountyId,
            userId,
            promptId: validation.data.promptId,
            status: 'pending'
        });

        return submission;
    }

    /**
     * Award bounty to a submission (creator only)
     */
    async awardBounty(bountyId, creatorId, submissionId) {
        const bounty = await bountyRepository.findByIdSimple(bountyId);
        if (!bounty) throw new NotFoundError('Bounty not found');
        if (bounty.creatorId !== creatorId) throw new ForbiddenError('Only the bounty creator can award it');
        if (bounty.status !== 'open') throw new ValidationError('This bounty has already been awarded or closed');

        const submission = await bountyRepository.findSubmissionById(submissionId);
        if (!submission || submission.bountyId !== bountyId) {
            throw new NotFoundError('Submission not found for this bounty');
        }

        // Award the bounty and Release Escrow
        await bountyRepository.update(bountyId, {
            status: 'awarded',
            winnerId: submission.userId,
            escrowStatus: 'RELEASED',
            escrowReleasedAt: new Date()
        });

        // Update submission status
        await bountyRepository.updateSubmission(submissionId, { status: 'accepted' });

        // Reject other submissions
        await bountyRepository.rejectOtherSubmissions(bountyId, submissionId);

        // Credit winner's wallet from the Escrow pool
        await walletRepository.creditBalance(submission.userId, bounty.amount);

        return { 
            message: 'Bounty awarded and escrow released successfully', 
            winnerId: submission.userId, 
            amount: bounty.amount,
            escrowStatus: 'RELEASED'
        };
    }
}

export default new BountyService();
