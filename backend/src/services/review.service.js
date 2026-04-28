import reviewRepository from '../repositories/review.repository.js';
import productRepository from '../repositories/product.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import { validate, createReviewSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';

/**
 * Review Service
 * Handles product reviews and ratings
 */
class ReviewService {
    /**
     * Create a review for a product
     */
    async create(userId, productId, data) {
        const validation = validate(createReviewSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        // Check product exists
        const product = await productRepository.findByIdSimple(productId);
        if (!product) throw new NotFoundError('Product not found');

        // Check if user is the seller
        if (product.sellerId === userId) {
            throw new ValidationError('You cannot review your own product');
        }

        // Check if user already reviewed
        const existing = await reviewRepository.findByProductAndUser(productId, userId);
        if (existing) throw new ValidationError('You have already reviewed this product');

        // Check if user has purchased the product
        const hasPurchased = await transactionRepository.findFirst({
            buyerId: userId, productId, status: 'completed'
        });
        if (!hasPurchased) throw new ValidationError('You must purchase this product before reviewing');

        const review = await reviewRepository.create({
            productId,
            userId,
            rating: validation.data.rating,
            comment: validation.data.comment || null
        });

        // Update product rating
        const reviews = await reviewRepository.findAllRatingsByProduct(productId);
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        await productRepository.updateRating(productId, parseFloat(avgRating.toFixed(1)), reviews.length);

        return review;
    }

    /**
     * Get reviews for a product
     */
    async getByProduct(productId, { page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            reviewRepository.findByProduct(productId, { skip, take: parseInt(limit) }),
            reviewRepository.countByProduct(productId)
        ]);

        return {
            reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Delete a review (owner only)
     */
    async delete(reviewId, userId) {
        const review = await reviewRepository.findById(reviewId);
        if (!review) throw new NotFoundError('Review not found');
        if (review.userId !== userId) throw new ForbiddenError('Not authorized to delete this review');

        await reviewRepository.delete(reviewId);

        // Recalculate product rating
        const reviews = await reviewRepository.findAllRatingsByProduct(review.productId);
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        await productRepository.updateRating(review.productId, parseFloat(avgRating.toFixed(1)), reviews.length);

        return { message: 'Review deleted successfully' };
    }
}

export default new ReviewService();
