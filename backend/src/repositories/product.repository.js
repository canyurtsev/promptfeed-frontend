import prisma from '../config/database.js';

class ProductRepository {
    async findAll({ where, orderBy, skip, take }) {
        return prisma.product.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                prompt: true,
                seller: {
                    select: { username: true, avatarUrl: true }
                }
            }
        });
    }

    async count(where) {
        return prisma.product.count({ where });
    }

    async findById(id) {
        return prisma.product.findUnique({
            where: { id },
            include: {
                prompt: true,
                seller: {
                    select: { username: true, avatarUrl: true, bio: true }
                },
                reviews: {
                    include: {
                        user: { select: { username: true, avatarUrl: true } }
                    }
                }
            }
        });
    }

    async findByIdSimple(id) {
        return prisma.product.findUnique({ where: { id } });
    }

    async findByPromptId(promptId) {
        return prisma.product.findUnique({ where: { promptId } });
    }

    async create(data) {
        return prisma.product.create({ data });
    }

    async incrementSales(id) {
        return prisma.product.update({
            where: { id },
            data: { salesCount: { increment: 1 } }
        });
    }

    async updateRating(id, rating, reviewCount) {
        return prisma.product.update({
            where: { id },
            data: { rating, reviewCount }
        });
    }
}

export default new ProductRepository();
