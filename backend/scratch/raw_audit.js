import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== RAW DB AUDIT ===");
    try {
        const owners = await prisma.$queryRaw`SELECT * FROM "Ownership"`;
        console.log(`Raw Ownerships Count: ${owners.length}`);
        console.log(JSON.stringify(owners, null, 2));
    } catch (err) {
        console.error("Raw Ownership query failed:", err.message);
    }

    try {
        const txs = await prisma.$queryRaw`SELECT * FROM "Transaction"`;
        console.log(`\nRaw Transactions Count: ${txs.length}`);
        console.log(JSON.stringify(txs, null, 2));
    } catch (err) {
        console.error("Raw Transaction query failed:", err.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
