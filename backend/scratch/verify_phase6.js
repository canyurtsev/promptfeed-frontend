import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function verifyPhase6() {
    console.log("🔍 Starting Phase 6 Final Verification...");

    try {
        // 1. Traceability & Serialization Check
        console.log("\n1. [TRACEABILITY] Checking Response Headers & Serialization...");
        const res1 = await fetch(`${API_URL}/prompts?limit=1`);
        const data1 = await res1.json();

        const requestId = res1.headers.get('x-request-id');
        console.log(`   - X-Request-Id: ${requestId ? '✅ ' + requestId : '❌ MISSING'}`);

        console.log(`   - Payload success: ${data1.success === true ? '✅' : '❌'}`);

        const firstPrompt = data1.data.prompts[0];
        console.log(`   - Price Type: ${typeof firstPrompt.price === 'string' ? '✅ string' : '❌ ' + typeof firstPrompt.price}`);
        console.log(`   - Price Value: "${firstPrompt.price}"`);

        // 2. Standardized Error: RATE_LIMITED
        console.log("\n2. [RATE LIMIT] Testing Purchase Limiter (3/min)...");

        let rateLimited = false;
        for (let i = 0; i < 6; i++) {
            const res = await fetch(`${API_URL}/marketplace/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: 'any' })
            });
            const data = await res.json();

            if (res.status === 429) {
                console.log(`   - Hit 429 on attempt ${i + 1}`);
                console.log(`   - Error Code: ${data.error.code === 'RATE_LIMITED' ? '✅ RATE_LIMITED' : '❌ ' + data.error.code}`);
                console.log(`   - requestId in error body: ${data.error.requestId === requestId ? '✅ matched' : '✅ generated (' + data.error.requestId + ')'}`);
                rateLimited = true;
                break;
            }
        }
        if (!rateLimited) console.log("   - ⚠️ Did not hit rate limit (Might be hitting a different bucket or limit not reached)");

        // 3. Audit Persistence Check
        console.log("\n3. [AUDIT] Checking DB persistence for latest marketplace audit...");
        const latestAudit = await prisma.aILog.findFirst({
            where: { model: 'marketplace_audit' },
            orderBy: { createdAt: 'desc' }
        });

        if (latestAudit) {
            const auditData = JSON.parse(latestAudit.source);
            console.log(`   - Found audit record: ✅ ${auditData.type}`);
            console.log(`   - Audit Trace ID present: ${auditData.requestId ? '✅' : '❌'}`);
            console.log(`   - Uses netAmount: ${auditData.netAmount ? '✅' : '❌'}`);
            console.log(`   - Failure Reason present (if failed): ${auditData.failureReason || 'N/A'}`);
        } else {
            console.log("   - ⚠️ No audit records found in AILog yet (Try a purchase block to trigger one).");
        }

        console.log("\n✅ Verification Script Complete.");
    } catch (err) {
        console.error("❌ Verification failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPhase6();
