import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== ULTIMATE TRUTH VERIFICATION ===");
    const product = await prisma.product.findFirst();
    const user = await prisma.user.findFirst({ where: { username: 'testuser' } });

    console.log(`Testing with User: ${user.username}, Product: ${product.id}`);

    // Clean up existing ownership for this test
    await prisma.ownership.deleteMany({ where: { userId: user.id, productId: product.id } });
    console.log("Cleaned up existing ownerships.");

    console.log("Firing 10 simultaneous raw transactions...");

    const attempts = Array.from({ length: 10 }).map(async (i) => {
        try {
            return await prisma.$transaction(async (tx) => {
                // Check if already exists (simulated race)
                const exists = await tx.ownership.findUnique({
                    where: { userId_productId: { userId: user.id, productId: product.id } }
                });
                if (exists) throw new Error("Already exists");

                // Create (Unique constraint should catch if multiple pass the check)
                return await tx.ownership.create({
                    data: { userId: user.id, productId: product.id }
                });
            });
        } catch (err) {
            return { error: err.message };
        }
    });

    const results = await Promise.all(attempts);
    const successes = results.filter(r => r && !r.error);
    const failures = results.filter(r => r && r.error);

    console.log(`\nResults:`);
    console.log(`Successes: ${successes.length} (Expected: 1)`);
    console.log(`Failures: ${failures.length} (Expected: 9)`);

    if (successes.length === 1) {
        console.log("\n✅ VERDICT: DATABASE HARDENING VERIFIED. Unique constraints are functional.");
    } else {
        console.log("\n❌ VERDICT: DATABASE HARDENING FAILED.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
