import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst();
    const buyer = await prisma.user.findFirst({
        where: {
            NOT: { id: product.sellerId },
            username: { not: 'admin' }
        }
    });

    const ownerships = await prisma.ownership.findMany({
        where: { userId: buyer.id, productId: product.id }
    });
    const transactions = await prisma.transaction.findMany({
        where: { buyerId: buyer.id, productId: product.id }
    });

    console.log("=== DB AUDIT POST-STRESS-TEST ===");
    console.log(`Buyer: ${buyer.username}`);
    console.log(`Balance: ${buyer.walletBalance}`);
    console.log(`Ownerships: ${ownerships.length}`);
    console.log(`Transactions: ${transactions.length}`);

    if (ownerships.length === 1 && transactions.length === 1) {
        console.log("RESULT: PASS - Integrity verified.");
    } else {
        console.log("RESULT: FAIL - Inconsistency found.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
