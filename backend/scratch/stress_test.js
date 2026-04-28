import { PrismaClient } from '@prisma/client';
import marketplaceService from '../src/services/marketplace.service.js';

const prisma = new PrismaClient();

async function stressTest() {
    console.log("=== Phase 5: Concurrent Purchase Stress Test ===");

    // 1. Setup Data
    const product = await prisma.product.findFirst();
    if (!product) {
        console.error("No products found to test.");
        return;
    }

    // Find a buyer who is NOT the seller
    const buyer = await prisma.user.findFirst({
        where: {
            NOT: { id: product.sellerId },
            username: { not: 'admin' } // Avoid admin if possible
        }
    });

    if (!buyer) {
        console.error("No valid buyer found.");
        return;
    }

    console.log(`Buyer: ${buyer.username} (${buyer.id})`);
    console.log(`Product: ${product.id} (Price: ${product.price})`);
    console.log(`Initial Balance: ${buyer.walletBalance}`);

    // 2. Perform 10 concurrent purchase attempts
    console.log("Initiating 10 simultaneous purchase attempts...");

    const attempts = Array.from({ length: 10 }).map(() =>
        marketplaceService.purchaseProduct(buyer.id, product.id)
            .then(res => ({ success: true, data: res }))
            .catch(err => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(attempts);

    // 3. Analyze Results
    const successes = results.filter(r => r.success && !r.data._alreadyOwned);
    const idempotentSuccesses = results.filter(r => r.success && r.data._alreadyOwned);
    const failures = results.filter(r => !r.success);

    console.log("\n--- TEST RESULTS ---");
    console.log(`Total Attempts: 10`);
    console.log(`Initial Pure Successes (1 expected): ${successes.length}`);
    console.log(`Idempotent Successes (Already Owned): ${idempotentSuccesses.length}`);
    console.log(`Failures/Rejections: ${failures.length}`);

    // 4. Verify DB Integrity
    const finalBuyer = await prisma.user.findUnique({ where: { id: buyer.id } });
    const ownerships = await prisma.ownership.findMany({
        where: { userId: buyer.id, productId: product.id }
    });
    const transactions = await prisma.transaction.findMany({
        where: { buyerId: buyer.id, productId: product.id }
    });

    console.log("\n--- INTEGRITY AUDIT ---");
    console.log(`Final Balance: ${finalBuyer.walletBalance}`);
    console.log(`Ownership Records Count (1 expected): ${ownerships.length}`);
    console.log(`Transaction Records Count (1 expected): ${transactions.length}`);

    if (successes.length === 1 && ownerships.length === 1 && transactions.length === 1) {
        console.log("\n✅ VERDICT: PASS. Transaction integrity maintained under concurrent load.");
    } else {
        console.log("\n❌ VERDICT: FAIL. Inconsistency detected.");
    }
}

stressTest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
