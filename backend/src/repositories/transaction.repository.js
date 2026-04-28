import prisma from '../config/database.js';

class TransactionRepository {
    async findFirst(where) {
        return prisma.transaction.findFirst({ where });
    }

    async findAll({ where, orderBy, skip, take }) {
        return prisma.transaction.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                buyer: { select: { username: true } },
                seller: { select: { username: true } },
                product: { include: { prompt: { select: { title: true } } } }
            }
        });
    }

    async count(where) {
        return prisma.transaction.count({ where });
    }

    async create(data) {
        return prisma.transaction.create({ data });
    }

    async findById(id) {
        return prisma.transaction.findUnique({
            where: { id },
            include: {
                buyer: true,
                seller: true,
                product: { include: { prompt: true } }
            }
        });
    }
}

export default new TransactionRepository();
