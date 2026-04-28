// Review Repository
import prisma from '../config/database.js';

class ReviewRepository {
    async findByProduct(productId) {
        return prisma.review.findMany({
            where: { productId },
            include: { user: { select: { username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data) {
        return prisma.review.create({ data });
    }
}

export const reviewRepository = new ReviewRepository();

// Comment Repository
class CommentRepository {
    async findByPrompt(promptId, { skip = 0, take = 20 } = {}) {
        return prisma.comment.findMany({
            where: { promptId },
            include: { user: { select: { username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    }

    async create(data) {
        return prisma.comment.create({
            data,
            include: { user: { select: { username: true, avatarUrl: true } } }
        });
    }
}

export const commentRepository = new CommentRepository();
