import prisma from '../config/database.js';

class CommentService {
    async create(promptId, userId, content, parentId = null) {
        return prisma.comment.create({
            data: {
                promptId,
                userId,
                content,
                parentId
            },
            include: {
                user: {
                    select: {
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }

    async getByPrompt(promptId, { page = 1, limit = 20 } = {}) {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        return prisma.comment.findMany({
            where: { promptId },
            include: {
                user: {
                    select: {
                        username: true,
                        avatarUrl: true
                    }
                },
                children: {
                    include: {
                        user: { select: { username: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
        });
    }
}

export default new CommentService();
