import prisma from '../config/database.js';

/**
 * Review Repository
 * Handles database operations for product reviews
 */
class ReviewRepository {
    async findByProductAndUser(productId, userId) {
        return await prisma.review.findFirst({
            where: { productId, userId }
        });
    }

    async create(data) {
        return await prisma.review.create({
            data,
            include: {
                user: { select: { username: true, avatarUrl: true } }
            }
        });
    }

    async findAllRatingsByProduct(productId) {
        return await prisma.review.findMany({
            where: { productId },
            select: { rating: true }
        });
    }

    async findByProduct(productId, { skip, take }) {
        return await prisma.review.findMany({
            where: { productId },
            skip,
            take,
            include: {
                user: { select: { username: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async countByProduct(productId) {
        return await prisma.review.count({
            where: { productId }
        });
    }

    async findById(id) {
        return await prisma.review.findUnique({
            where: { id }
        });
    }

    async delete(id) {
        return await prisma.review.delete({
            where: { id }
        });
    }
}

export default new ReviewRepository();
