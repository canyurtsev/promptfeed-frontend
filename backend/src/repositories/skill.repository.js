import prisma from '../config/database.js';

class SkillRepository {
    async create(data) {
        return prisma.skill.create({
            data: {
                title: data.title,
                description: data.description,
                content: data.content,
                userId: data.userId,
                tags: data.tags,
                prompts: {
                    create: (data.promptIds || []).map(pid => ({
                        promptId: pid
                    }))
                }
            },
            include: {
                prompts: { include: { prompt: true } },
                user: { select: { username: true, fullName: true, avatarUrl: true } }
            }
        });
    }

    async findAll() {
        return prisma.skill.findMany({
            include: {
                user: { select: { username: true } },
                prompts: { include: { prompt: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findById(id) {
        return prisma.skill.findUnique({
            where: { id },
            include: {
                user: { select: { username: true, avatarUrl: true } },
                prompts: { include: { prompt: true } }
            }
        });
    }

    async findByUserId(userId) {
        return prisma.skill.findMany({
            where: { userId },
            include: {
                prompts: { include: { prompt: true } }
            }
        });
    }
}

export default new SkillRepository();
