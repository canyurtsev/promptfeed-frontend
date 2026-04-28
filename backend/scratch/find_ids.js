import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { username: 'testuser' } });
    const product = await prisma.product.findFirst();
    const buyer = await prisma.user.findFirst({ where: { NOT: { id: product.ownerId } } });

    console.log(JSON.stringify({
        buyerId: buyer.id,
        productId: product.id,
        initialBalance: buyer.walletBalance
    }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
