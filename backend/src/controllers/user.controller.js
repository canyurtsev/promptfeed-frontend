import userRepository from '../repositories/user.repository.js';
import promptRepository from '../repositories/prompt.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
import prisma from '../config/database.js';

class UserController {
    async getMe(req, res, next) {
        try {
            const user = await userRepository.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            let plan = 'free';
            let subscriptionStatus = null;
            if (user.subscription && user.subscription.status === 'active') {
                plan = user.subscription.plan.toLowerCase();
                subscriptionStatus = user.subscription.status;
            }
            user.plan = plan;
            user.subscriptionStatus = subscriptionStatus;

            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarks(req, res, next) {
        try {
            const bookmarks = await userRepository.findBookmarks(req.user.id);
            res.json({ success: true, data: bookmarks });
        } catch (error) {
            next(error);
        }
    }

    async getSavedPrompts(req, res, next) {
        try {
            const saves = await userRepository.findSavedPrompts(req.user.id);
            res.json({ success: true, data: saves });
        } catch (error) {
            next(error);
        }
    }

    async getMyPrompts(req, res, next) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const prompts = await promptRepository.findAll({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            });

            const total = await promptRepository.count({ userId: req.user.id });

            res.json({
                success: true,
                data: {
                    prompts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateMe(req, res, next) {
        try {
            const user = await userRepository.update(req.user.id, req.body);
            res.json({ success: true, data: user, message: 'Profile updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const user = await userRepository.findById(req.params.id);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const user = await userRepository.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            let plan = 'free';
            let subscriptionStatus = null;
            if (user.subscription && user.subscription.status === 'active') {
                plan = user.subscription.plan.toLowerCase();
                subscriptionStatus = user.subscription.status;
            }
            user.plan = plan;
            user.subscriptionStatus = subscriptionStatus;

            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const user = await userRepository.update(req.user.id, req.body);
            res.json({ success: true, data: user, message: 'Profile updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getPurchasedPrompts(req, res, next) {
        try {
            const prompts = await userRepository.findPurchasedPrompts(req.user.id);
            res.json({ success: true, data: { prompts } });
        } catch (error) {
            next(error);
        }
    }

    async getWallet(req, res, next) {
        try {
            let wallet = await walletRepository.findByUserId(req.user.id);
            if (!wallet) {
                wallet = await walletRepository.upsert(req.user.id, {}, { balance: 0 });
            }
            res.json({ success: true, data: { balance: parseFloat(wallet.balance) } });
        } catch (error) {
            next(error);
        }
    }

    async getEarnings(req, res, next) {
        try {
            const purchases = await prisma.$queryRaw`
                SELECT
                    pp.id AS "purchaseId",
                    pp."createdAt",
                    pp."pricePaid",
                    p.id AS "promptId",
                    p.title
                FROM "PromptPurchase" pp
                JOIN "Prompt" p ON p.id = pp."promptId"
                WHERE p."userId" = ${req.user.id}
                ORDER BY pp."createdAt" DESC
            `;

            const sales = purchases.map(row => ({
                promptId: row.promptId,
                title: row.title,
                pricePaid: parseFloat(row.pricePaid),
                createdAt: row.createdAt
            }));

            const totalEarnings = sales.reduce((sum, s) => sum + s.pricePaid, 0);

            res.json({
                success: true,
                data: {
                    totalEarnings,
                    sales
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getExecutions(req, res, next) {
        try {
            const executions = await promptRepository.findExecutionsByUser(req.user.id);
            res.json({ success: true, data: executions });
        } catch (error) {
            next(error);
        }
    }
}

export default new UserController();
