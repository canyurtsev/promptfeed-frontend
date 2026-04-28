import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const ownerships = await prisma.ownership.findMany({ include: { user: true, product: { include: { prompt: true } } } });
    const transactions = await prisma.transaction.findMany();
    const wallets = await prisma.wallet.findMany({ include: { user: true } });

    console.log("=== DEEP DB AUDIT ===");
    console.log(`Total Ownerships: ${ownerships.length}`);
    console.log(`Total Transactions: ${transactions.length}`);

    console.log("\n--- Ownership Map ---");
    ownerships.forEach(o => {
        console.log(`User: ${o.user.username} -> Product: ${o.productId} (Prompt: ${o.product.prompt.title})`);
    });

    console.log("\n--- Wallets ---");
    wallets.forEach(w => {
        console.log(`User: ${w.user.username} | Balance: ${w.balance}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
