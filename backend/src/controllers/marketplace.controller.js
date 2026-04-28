import marketplaceService from '../services/marketplace.service.js';
import reviewService from '../services/review.service.js';

/**
 * Marketplace Controller
 * Handles HTTP request/response for marketplace endpoints
 */
class MarketplaceController {
    async listProducts(req, res) {
        const { category, sort, search, page, limit } = req.query;
        const result = await marketplaceService.listProducts({ category, sort, search, page, limit });

        res.json({
            success: true,
            data: result
        });
    }

    async getProduct(req, res) {
        const product = await marketplaceService.getProduct(req.params.id);

        res.json({
            success: true,
            data: product
        });
    }

    async createProduct(req, res) {
        const product = await marketplaceService.createProduct(req.user.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Product listed successfully',
            data: product
        });
    }

    async purchase(req, res) {
        const transaction = await marketplaceService.purchaseProduct(req.user.id, req.body.productId, req.requestId);

        res.json({
            success: true,
            message: 'Purchase completed successfully',
            data: transaction
        });
    }

    async getReviews(req, res) {
        const { page, limit } = req.query;
        const result = await reviewService.getByProduct(req.params.id, { page, limit });

        res.json({
            success: true,
            data: result
        });
    }

    async createReview(req, res) {
        const review = await reviewService.create(req.user.id, req.params.id, req.body);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    }

    async deleteReview(req, res) {
        const result = await reviewService.delete(req.params.id, req.user.id);

        res.json({
            success: true,
            ...result
        });
    }
}

export default new MarketplaceController();
