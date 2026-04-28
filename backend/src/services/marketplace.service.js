import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import productRepository from '../repositories/product.repository.js';
import promptRepository from '../repositories/prompt.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
import { validate, createProductSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';
import { serializeDecimals } from '../utils/serialization.js';
import { logger } from '../utils/logger.js';

/**
 * Marketplace Service
 * Handles product listing, details, and purchasing
 */
class MarketplaceService {
    /**
     * List marketplace products with filtering
     */
    async listProducts({ category, sort = 'latest', search, page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const where = {};

        if (category) {
            where.prompt = { category };
        }
        if (search) {
            where.prompt = {
                ...where.prompt,
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        let orderBy;
        switch (sort) {
            case 'popular':
                orderBy = { salesCount: 'desc' };
                break;
            case 'rating':
                orderBy = { rating: 'desc' };
                break;
            case 'price_low':
                orderBy = { price: 'asc' };
                break;
            case 'price_high':
                orderBy = { price: 'desc' };
                break;
            case 'latest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        const [products, total] = await Promise.all([
            productRepository.findAll({ where, orderBy, skip, take: parseInt(limit) }),
            productRepository.count(where)
        ]);

        return serializeDecimals({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }

    /**
     * Get product details with reviews
     */
    async getProduct(id) {
        const product = await productRepository.findById(id);
        if (!product) throw new NotFoundError('Product not found');
        return serializeDecimals(product);
    }

    /**
     * Create a product (list prompt for sale)
     */
    async createProduct(userId, data) {
        const validation = validate(createProductSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const { promptId, price, currency, licenseType } = validation.data;

        // Verify prompt ownership
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');
        if (prompt.userId !== userId) throw new ForbiddenError('You can only sell your own prompts');

        // Check if already listed
        const existing = await productRepository.findByPromptId(promptId);
        if (existing) throw new ValidationError('This prompt is already listed for sale');

        // Mark prompt as premium
        await promptRepository.updateSimple(promptId, { isPremium: true, price: new Prisma.Decimal(price) });

        const product = await productRepository.create({
            promptId,
            sellerId: userId,
            price: new Prisma.Decimal(price),
            currency: currency || 'USD',
            licenseType: licenseType || null
        });

        return serializeDecimals(product);
    }

    /**
     * Purchase a product
     */
    async purchaseProduct(buyerId, productId, requestId = null) {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Fetch product & Verify existence
                const product = await tx.product.findUnique({
                    where: { id: productId },
                    include: { 
                        prompt: true,
                        seller: { include: { wallet: true } }
                    }
                });

                if (!product) throw new NotFoundError('Product not found');
                if (product.sellerId === buyerId) throw new ValidationError('You cannot buy your own product');

                // 2. Idempotency Check: Already purchased?
                const existingOwnership = await tx.ownership.findUnique({
                    where: { userId_productId: { userId: buyerId, productId } }
                });

                if (existingOwnership) {
                    return { success: true, _alreadyOwned: true };
                }

                // 3. Verify balance (Strict Decimal comparison)
                const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
                if (!buyerWallet || buyerWallet.balance.lt(product.price)) {
                    const platformFeeRate = new Prisma.Decimal(process.env.PLATFORM_FEE || 0.15);
                    const fee = product.price.mul(platformFeeRate).toDecimalPlaces(2);
                    const netAmount = product.price.sub(fee);

                    const auditData = {
                        type: 'PURCHASE',
                        status: 'FAILED',
                        failureReason: 'INSUFFICIENT_FUNDS',
                        buyerId,
                        sellerId: product.sellerId,
                        productId,
                        amount: product.price.toString(),
                        fee: fee.toString(),
                        netAmount: netAmount.toString(),
                        requestId,
                        timestamp: new Date().toISOString()
                    };

                    // Throw a special error to be handled outside the transaction
                    const error = new ValidationError('Insufficient funds in wallet');
                    error.errorCode = 'INSUFFICIENT_FUNDS';
                    error.requestId = requestId;
                    error.auditData = auditData;
                    throw error;
                }

                // 4. Calculate fees (Decimal precision)
                const platformFeeRate = new Prisma.Decimal(process.env.PLATFORM_FEE || 0.15);
                const fee = product.price.mul(platformFeeRate).toDecimalPlaces(2);
                const netAmount = product.price.sub(fee);

                // 5. Debit Buyer Wallet (Atomic)
                await tx.wallet.update({
                    where: { userId: buyerId },
                    data: {
                        balance: { decrement: product.price },
                        totalSpent: { increment: product.price }
                    }
                });

                // 6. Credit Seller Wallet (Atomic)
                await tx.wallet.update({
                    where: { userId: product.sellerId },
                    data: {
                        balance: { increment: netAmount },
                        totalEarnings: { increment: netAmount }
                    }
                });

                // 7. Record Transaction
                const transaction = await tx.transaction.create({
                    data: {
                        buyerId,
                        sellerId: product.sellerId,
                        productId,
                        amount: product.price,
                        platformFee: fee,
                        sellerEarnings: netAmount, // DB field internal name
                        currency: product.currency,
                        status: 'completed',
                        paymentMethod: 'wallet'
                    }
                });

                // 8. Create Ownership Record (Strict Unique Constraint)
                try {
                    await tx.ownership.create({
                        data: {
                            userId: buyerId,
                            productId
                        }
                    });
                } catch (err) {
                    if (err.code === 'P2002') {
                        const error = new ValidationError('Product already owned (race condition intercepted)');
                        error.errorCode = 'ALREADY_OWNED';
                        throw error;
                    }
                    throw err;
                }

                // 9. Update Product Sales Count
                await tx.product.update({
                    where: { id: productId },
                    data: { salesCount: { increment: 1 } }
                });

                // 10. Audit Logging (Structured JSON & DB Persistence)
                const auditData = {
                    type: 'PURCHASE',
                    status: 'COMPLETED',
                    buyerId,
                    sellerId: product.sellerId,
                    productId,
                    amount: product.price.toString(),
                    fee: fee.toString(),
                    netAmount: netAmount.toString(),
                    requestId,
                    timestamp: new Date().toISOString()
                };

                logger.info('Purchase completed successfully', auditData);

                await tx.aILog.create({
                    data: {
                        userId: buyerId,
                        model: 'marketplace_audit',
                        source: JSON.stringify(auditData)
                    }
                });

                // Standardize return with netAmount and stringified fields
                return serializeDecimals({
                    ...transaction,
                    netAmount: transaction.sellerEarnings // map for consistency
                });
            });
        } catch (error) {
            if (error.auditData) {
                // Persist structured log in DB (Audit Trail) - OUTSIDE rolled back transaction
                await prisma.aILog.create({
                    data: {
                        userId: buyerId,
                        model: 'marketplace_audit',
                        source: JSON.stringify(error.auditData)
                    }
                });
                logger.warn('Purchase attempt failed', error.auditData);
            }
            throw error;
        }
    }
}

export default new MarketplaceService();
