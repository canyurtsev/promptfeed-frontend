import walletRepository from '../repositories/wallet.repository.js';
import paymentService from '../services/payment.service.js';

class WalletController {
    async getWallet(req, res, next) {
        try {
            const wallet = await walletRepository.findByUserId(req.user.id);
            res.json({ success: true, data: wallet || { balance: 0, totalEarnings: 0 } });
        } catch (error) {
            next(error);
        }
    }

    async getTransactions(req, res, next) {
        try {
            const result = await paymentService.getTransactions(req.user.id, req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async requestPayout(req, res, next) {
        try {
            const { amount } = req.body;
            const result = await walletRepository.requestPayout(req.user.id, amount);
            res.json({ success: true, data: result, message: 'Payout requested successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export default new WalletController();
