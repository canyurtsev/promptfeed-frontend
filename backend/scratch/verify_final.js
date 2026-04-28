import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const ownerships = await prisma.ownership.findMany();
    const transactions = await prisma.transaction.findMany();
    const result = {
        ownershipCount: ownerships.length,
        transactionCount: transactions.length,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync('scratch/integrity_report.json', JSON.stringify(result, null, 2));
    console.log("Report generated in scratch/integrity_report.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());
