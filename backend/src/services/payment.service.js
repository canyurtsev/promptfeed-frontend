import productRepository from '../repositories/product.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
import stripe from '../config/stripe.js';
import { NotFoundError, ValidationError } from '../middleware/error.middleware.js';

/**
 * Payment Service
 * Handles Stripe payment intents, webhooks, and transaction history
 */
class PaymentService {
    /**
     * Create a Stripe PaymentIntent for a product purchase
     */
    async createPaymentIntent(userId, productId) {
        const product = await productRepository.findByIdWithSeller(productId);

        if (!product) throw new NotFoundError('Product not found');
        if (product.sellerId === userId) throw new ValidationError('You cannot buy your own product');

        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(product.price * 100), // Convert to cents
                currency: product.currency.toLowerCase(),
                metadata: {
                    productId: product.id,
                    buyerId: userId,
                    sellerId: product.sellerId,
                    promptTitle: product.prompt.title
                }
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: product.price,
                currency: product.currency
            };
        } catch (error) {
            throw new ValidationError(`Payment processing error: ${error.message}`);
        }
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(event) {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const { productId, buyerId, sellerId } = paymentIntent.metadata;

                const product = await productRepository.findByIdSimple(productId);
                if (!product) return;

                const platformFee = parseFloat((product.price * parseFloat(process.env.PLATFORM_FEE || 0.15)).toFixed(2));
                const sellerEarnings = parseFloat((product.price - platformFee).toFixed(2));

                // Create transaction
                await transactionRepository.create({
                    buyerId,
                    sellerId,
                    productId,
                    amount: product.price,
                    platformFee,
                    sellerEarnings,
                    currency: product.currency,
                    status: 'completed',
                    paymentMethod: 'stripe',
                    stripePaymentId: paymentIntent.id
                });

                // Update product sales
                await productRepository.incrementSales(productId);

                // Credit seller wallet
                await walletRepository.creditBalance(sellerId, sellerEarnings);

                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const { productId, buyerId, sellerId } = paymentIntent.metadata;

                await transactionRepository.create({
                    buyerId,
                    sellerId,
                    productId,
                    amount: 0,
                    platformFee: 0,
                    sellerEarnings: 0,
                    currency: 'USD',
                    status: 'failed',
                    paymentMethod: 'stripe',
                    stripePaymentId: paymentIntent.id
                });
                break;
            }
        }
    }

    /**
     * Get user transaction history
     */
    async getTransactions(userId, { type = 'all', page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const where = {};

        if (type === 'purchases') {
            where.buyerId = userId;
        } else if (type === 'sales') {
            where.sellerId = userId;
        } else {
            where.OR = [{ buyerId: userId }, { sellerId: userId }];
        }

        const [transactions, total] = await Promise.all([
            transactionRepository.findAll({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
            transactionRepository.count(where)
        ]);

        return {
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

export default new PaymentService();
