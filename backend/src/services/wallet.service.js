import walletRepository from '../repositories/wallet.repository.js';
import { validate, payoutSchema } from '../utils/validators.js';
import { ValidationError, NotFoundError } from '../middleware/error.middleware.js';
import { serializeDecimals } from '../utils/serialization.js';

/**
 * Wallet Service
 * Handles balance, earnings tracking, and payouts
 */
class WalletService {
    /**
     * Get wallet balance and stats
     */
    async getWallet(userId) {
        const wallet = await walletRepository.findByUserId(userId);

        if (!wallet) {
            // Auto-create wallet if doesn't exist
            const newWallet = await walletRepository.create({
                userId,
                balance: 0,
                totalEarnings: 0,
                totalSpent: 0,
                pendingPayouts: 0,
                lifetimePayouts: 0
            });
            return serializeDecimals(newWallet);
        }

        return serializeDecimals(wallet);
    }

    /**
     * Request a payout
     */
    async requestPayout(userId, data) {
        const validation = validate(payoutSchema, data);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const { amount, payoutMethod, payoutDetails } = validation.data;

        const wallet = await walletRepository.findByUserId(userId);
        if (!wallet) throw new NotFoundError('Wallet not found');

        if (wallet.balance < amount) {
            throw new ValidationError('Insufficient balance');
        }

        const threshold = parseFloat(process.env.PAYOUT_THRESHOLD || 50);
        if (amount < threshold) {
            throw new ValidationError(`Minimum payout amount is $${threshold}`);
        }

        // Update wallet
        const updated = await walletRepository.requestPayout(userId, amount, payoutMethod, payoutDetails);

        return {
            message: 'Payout request submitted successfully',
            requestedAmount: amount,
            remainingBalance: updated.balance,
            pendingPayouts: updated.pendingPayouts
        };
    }

    /**
     * Credit wallet (internal use)
     */
    async creditWallet(userId, amount) {
        return await walletRepository.creditBalance(userId, amount);
    }

    /**
     * Debit wallet (internal use)
     */
    async debitWallet(userId, amount) {
        const wallet = await walletRepository.findByUserId(userId);
        if (!wallet || wallet.balance < amount) {
            throw new ValidationError('Insufficient balance');
        }

        return await walletRepository.debitBalance(userId, amount);
    }
}

export default new WalletService();
