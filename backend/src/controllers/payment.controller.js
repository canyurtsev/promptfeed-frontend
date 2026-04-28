import paymentService from '../services/payment.service.js';

class PaymentController {
    async createPaymentIntent(req, res, next) {
        try {
            const { productId } = req.body;
            const result = await paymentService.createPaymentIntent(req.user.id, productId);
            res.json({ success: true, data: result });
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

    async webhook(req, res, next) {
        try {
            await paymentService.handleWebhook(req.body);
            res.json({ received: true });
        } catch (error) {
            next(error);
        }
    }
}

export default new PaymentController();
