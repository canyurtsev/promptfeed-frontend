import { PrismaClient } from '@prisma/client';
import marketplaceService from './src/services/marketplace.service.js';
import { logger } from './src/utils/logger.js';

const prisma = new PrismaClient();

async function testInsufficientFunds() {
    console.log("🧪 Starting Phase 6: INSUFFICIENT_FUNDS Verification...");

    try {
        // 1. Setup: Get a user with low balance and a product with high price
        // From seed.dev.js:
        // buyer1 (QuantTeam) has 50.0 balance
        // product2 (Healthcare HIPAA Pipeline) has 199.00 price
        
        const buyer = await prisma.user.findUnique({ where: { username: 'QuantTeam' } });
        const product = await prisma.product.findFirst({
            where: { price: { gt: 100 } }
        });

        if (!buyer || !product) {
            console.error("❌ Test setup failed: Buyer or Product not found. Run seed first.");
            return;
        }

        console.log(`👤 Buyer: ${buyer.username} (Balance: ${buyer.walletId ? 'see wallet' : 'N/A'})`);
        const wallet = await prisma.wallet.findUnique({ where: { userId: buyer.id } });
        console.log(`💰 Wallet Balance: ${wallet.balance}`);
        console.log(`🛒 Product Price: ${product.price}`);

        // 2. Trigger Purchase
        const testRequestId = 'test-req-' + Date.now();
        console.log(`🚀 Attempting purchase with requestId: ${testRequestId}`);
        
        try {
            await marketplaceService.purchaseProduct(buyer.id, product.id, testRequestId);
            console.error("❌ Error: Purchase should have failed with INSUFFICIENT_FUNDS but succeeded.");
        } catch (error) {
            console.log("✅ Caught expected error.");
            console.log("Debug Error Object:", {
                name: error.name,
                message: error.message,
                errorCode: error.errorCode,
                requestId: error.requestId,
                statusCode: error.statusCode
            });
            
            // 3. Verify Response Format
            console.log("📊 Verifying response format...");
            const isInsufficientFunds = error.errorCode === 'INSUFFICIENT_FUNDS';
            const hasRequestId = error.requestId === testRequestId;
            
            console.log(` - Error Code is INSUFFICIENT_FUNDS: ${isInsufficientFunds}`);
            console.log(` - Request ID matches: ${hasRequestId}`);
            
            if (!isInsufficientFunds || !hasRequestId) {
                console.error("❌ Response format verification failed.");
            } else {
                console.log("✅ Response format verified.");
            }

            // 4. Verify AILog Persistence
            console.log("🔍 Verifying AILog persistence...");
            // Wait a bit for DB write if it's async (though here it's in transaction or before throw)
            const log = await prisma.aILog.findFirst({
                where: {
                    userId: buyer.id,
                    model: 'marketplace_audit'
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!log) {
                console.error("❌ AILog entry not found.");
            } else {
                const metadata = JSON.parse(log.source);
                console.log("📝 Log Metadata:", JSON.stringify(metadata, null, 2));

                const requiredFields = [
                    'type', 'status', 'failureReason', 'buyerId', 'sellerId', 
                    'productId', 'amount', 'fee', 'netAmount', 'requestId', 'timestamp'
                ];

                const missingFields = requiredFields.filter(f => !metadata[f]);
                
                if (missingFields.length > 0) {
                    console.error(`❌ Missing metadata fields: ${missingFields.join(', ')}`);
                } else if (metadata.type !== 'PURCHASE' || metadata.status !== 'FAILED' || metadata.failureReason !== 'INSUFFICIENT_FUNDS') {
                    console.error("❌ Metadata field values are incorrect.");
                } else {
                    console.log("✅ AILog metadata verified.");
                }
            }
        }

    } catch (err) {
        console.error("❌ Unexpected test error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testInsufficientFunds();
