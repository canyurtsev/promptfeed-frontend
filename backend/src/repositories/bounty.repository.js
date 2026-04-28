import prisma from '../config/database.js';

/**
 * Bounty Repository
 * Handles all database operations for Bounty and BountySubmission models
 */
class BountyRepository {
    // ── Bounty CRUD ──

    async findAll({ where, orderBy, skip, take }) {
        return await prisma.bounty.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                creator: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                },
                _count: { select: { submissions: true } }
            }
        });
    }

    async count(where) {
        return await prisma.bounty.count({ where });
    }

    async findById(id) {
        return await prisma.bounty.findUnique({
            where: { id },
            include: {
                creator: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                },
                winner: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                },
                submissions: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, avatarUrl: true }
                        },
                        prompt: {
                            select: { id: true, title: true, description: true }
                        }
                    },
                    orderBy: { submittedAt: 'desc' }
                }
            }
        });
    }

    async findByIdSimple(id) {
        return await prisma.bounty.findUnique({ where: { id } });
    }

    async create(data) {
        return await prisma.bounty.create({
            data,
            include: {
                creator: {
                    select: { id: true, username: true, fullName: true, avatarUrl: true }
                }
            }
        });
    }

    async update(id, data) {
        return await prisma.bounty.update({ where: { id }, data });
    }

    // ── Submission Operations ──

    async findSubmissionById(id) {
        return await prisma.bountySubmission.findUnique({ where: { id } });
    }

    async findSubmissionByUser(bountyId, userId) {
        return await prisma.bountySubmission.findFirst({ where: { bountyId, userId } });
    }

    async createSubmission(data) {
        return await prisma.bountySubmission.create({
            data,
            include: {
                user: {
                    select: { id: true, username: true, fullName: true }
                },
                prompt: {
                    select: { id: true, title: true }
                }
            }
        });
    }

    async updateSubmission(id, data) {
        return await prisma.bountySubmission.update({ where: { id }, data });
    }

    async rejectOtherSubmissions(bountyId, acceptedSubmissionId) {
        return await prisma.bountySubmission.updateMany({
            where: {
                bountyId,
                id: { not: acceptedSubmissionId }
            },
            data: { status: 'rejected' }
        });
    }
}

export default new BountyRepository();
