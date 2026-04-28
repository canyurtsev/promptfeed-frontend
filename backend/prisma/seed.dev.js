import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting Database Seed for PromptFeed Phase 3...");

    // 1. CLEAR DATABASE (Exhaustive order to satisfy all Foreign Key constraints)
    console.log("🧹 Clearing existing data to prevent collisions...");
    await prisma.transaction.deleteMany();
    await prisma.bountySubmission.deleteMany();
    await prisma.bounty.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.skillPrompt.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.promptVote.deleteMany();
    await prisma.promptBookmark.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.boost.deleteMany();
    await prisma.promptVersion.deleteMany();
    await prisma.promptMetrics.deleteMany();
    await prisma.promptTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.prompt.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.aILog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.apiCache.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);

    // 2. SEED USERS & WALLETS
    console.log("👤 Creating Realistic Users and Wallets...");

    const admin = await prisma.user.create({
        data: {
            username: 'nexus_admin',
            email: 'admin@promptfeed.com',
            passwordHash,
            role: 'ADMIN',
            fullName: 'Nexus Administrator',
            wallet: { create: { balance: 15000.0, totalEarnings: 15000.0 } }
        }
    });

    const creator1 = await prisma.user.create({
        data: {
            username: 'Hex_Corp',
            email: 'hex@corp.com',
            passwordHash,
            role: 'CREATOR',
            fullName: 'Hexa Corporation AI Labs',
            wallet: { create: { balance: 450.0, totalEarnings: 2800.0 } }
        }
    });

    const creator2 = await prisma.user.create({
        data: {
            username: 'MedAI',
            email: 'contact@medai.health',
            passwordHash,
            role: 'CREATOR',
            fullName: 'MedAI Healthcare Logic Integrations',
            wallet: { create: { balance: 1200.0, totalEarnings: 5500.0 } }
        }
    });

    const buyer1 = await prisma.user.create({
        data: {
            username: 'QuantTeam',
            email: 'dev@quant.io',
            passwordHash,
            role: 'USER',
            fullName: 'Quant Trading Solutions',
            wallet: { create: { balance: 50.0, totalSpent: 450.0 } }
        }
    });

    const buyer2 = await prisma.user.create({
        data: {
            username: 'IndieHacker',
            email: 'hello@indie.co',
            passwordHash,
            role: 'USER',
            fullName: 'Solo Fullstack Developer',
            wallet: { create: { balance: 150.0, totalSpent: 30.0 } }
        }
    });

    // 3. SEED SKILLS (Agentic Frameworks)
    console.log("🧠 Creating AI Skills (Agents & Tools)...");

    const skill1 = await prisma.skill.create({
        data: {
            title: 'core / advanced-reasoner-v4',
            description: 'Self-correcting deductive reasoning loop for multi-step engineering audits and complex architectural planning.',
            content: '# Advanced Reasoner\n\nImplements a multi-agent deductive logic loop allowing recursive checking.',
            tags: 'reasoning,automation,logic,all',
            userId: creator1.id,
            licenseType: 'enterprise',
            price: 99.0,
        }
    });

    const skill2 = await prisma.skill.create({
        data: {
            title: 'tools / github-api-integrated-worker',
            description: 'Function-calling bridge for GitHub Issue management, branch synchronization, and automated code review pipelines.',
            content: '# GitHub API Bridge\n\nSynchronizes git commands automatically, pulling diffs and reviewing code live.',
            tags: 'tools,utility,api,all',
            userId: admin.id,
            licenseType: 'free',
            price: 0,
        }
    });

    const skill3 = await prisma.skill.create({
        data: {
            title: 'security / logic-flow-auditor',
            description: 'Specialized prompt safety auditor designed to find hallucination vectors and injection points in complex agent chains.',
            content: '# Logic Flow Auditor\n\nRuns a monte-carlo simulation across the decision tree to find boundary breaks.',
            tags: 'security,compliance,audit,all',
            userId: creator2.id,
            licenseType: 'standard',
            price: 15.0,
        }
    });

    // 4. SEED PROMPTS
    console.log("✍️ Creating Mixed Free and Premium Prompts...");

    const prompt1 = await prisma.prompt.create({
        data: {
            userId: creator1.id,
            title: 'Agent Swarm Coordinator',
            description: 'Enterprise-grade coordination module for managing 10+ autonomous agents in parallel with state synchronization.',
            content: 'SYSTEM: You are the Chief Coordinator Node. Your role is strictly to parallelize sub-tasks across downstream LLMs...',
            category: 'Architecture',
            tags: 'metaprompt,architecture,swarm',
            isPremium: true,
            price: 49.99,
            viewsCount: 1402,
            score: 342,
            bookmarksCount: 88,
            createdAt: new Date(Date.now() - 3600000 * 48) // 48 hours ago
        }
    });

    const prompt2 = await prisma.prompt.create({
        data: {
            userId: creator2.id,
            title: 'Healthcare HIPAA Pipeline',
            description: 'Certified PII-stripping logic gate for securely forwarding medical records to LLMs.',
            content: 'SYSTEM: Your sole objective is to identify and replace Protected Health Information (PHI) with synthetic non-reversible tokens...',
            category: 'Security',
            tags: 'healthcare,compliance,security',
            isPremium: true,
            price: 199.00,
            viewsCount: 521,
            score: 128,
            bookmarksCount: 45,
            createdAt: new Date(Date.now() - 3600000 * 24) // 24 hours ago
        }
    });

    const prompt3 = await prisma.prompt.create({
        data: {
            userId: creator1.id,
            title: 'High-Frequency Trading Analyst',
            description: 'Low-latency financial data summarizer optimized for the latest reasoning models.',
            content: 'SYSTEM: Analyze the provided OHLCV ticks stream. Ignore macroeconomic noise. Identify micro-market structure breaks...',
            category: 'Finance',
            tags: 'trading,finance,data',
            isPremium: true,
            price: 89.00,
            viewsCount: 2200,
            score: 843,
            bookmarksCount: 150,
            createdAt: new Date(Date.now() - 3600000 * 12) // 12 hours ago
        }
    });

    const prompt4 = await prisma.prompt.create({
        data: {
            userId: buyer1.id, // Buyer who also released a free prompt
            title: 'Zero-Shot SQL Schema Generator',
            description: 'Transform natural language business requirements directly into fully normalized PostgreSQL schemas with indexes.',
            content: 'SYSTEM: Act as a Sr. Database Architect. Input is business specs. Output is strictly executable PostgreSQL commands. Include indexes for standard search queries.',
            category: 'Coding',
            tags: 'sql,database,backend',
            isPremium: false,
            viewsCount: 8900,
            score: 950,
            bookmarksCount: 310,
            createdAt: new Date(Date.now() - 3600000 * 72) // 72 hours ago
        }
    });

    // Link a skill to a prompt
    await prisma.skillPrompt.create({
        data: { skillId: skill1.id, promptId: prompt1.id }
    });

    // 5. SEED MARKETPLACE PRODUCTS
    console.log("🛒 Pricing Premium Prompts on the Marketplace...");

    const product1 = await prisma.product.create({
        data: {
            promptId: prompt1.id,
            sellerId: creator1.id,
            price: 49.99,
            enterprisePrice: 499.00,
            licenseType: 'Standard',
            salesCount: 45,
            rating: 4.8,
            reviewCount: 12,
            isFeatured: true
        }
    });

    const product2 = await prisma.product.create({
        data: {
            promptId: prompt2.id,
            sellerId: creator2.id,
            price: 199.00,
            enterprisePrice: 1990.00,
            licenseType: 'Commercial',
            salesCount: 8,
            rating: 5.0,
            reviewCount: 3,
            isFeatured: true
        }
    });

    const product3 = await prisma.product.create({
        data: {
            promptId: prompt3.id,
            sellerId: creator1.id,
            price: 89.00,
            enterprisePrice: 890.00,
            licenseType: 'Standard',
            salesCount: 21,
            rating: 4.6,
            reviewCount: 5,
            isFeatured: false
        }
    });

    // 6. SEED REALISTIC TRANSACTIONS AND WALLET UPDATES
    console.log("💸 Processing Historical Blockchain / Fiat Transactions...");

    // Buyer 1 bought Product 1
    await prisma.transaction.create({
        data: {
            buyerId: buyer1.id,
            sellerId: creator1.id,
            productId: product1.id,
            amount: 49.99,
            platformFee: 5.00, // 10% fee
            sellerEarnings: 44.99,
            status: 'COMPLETED',
            paymentMethod: 'CREDIT_CARD',
            createdAt: new Date(Date.now() - 3600000 * 5)
        }
    });

    // Buyer 2 bought Product 2
    await prisma.transaction.create({
        data: {
            buyerId: buyer2.id,
            sellerId: creator2.id,
            productId: product2.id,
            amount: 199.00,
            platformFee: 19.90, // 10% fee
            sellerEarnings: 179.10,
            status: 'COMPLETED',
            paymentMethod: 'WALLET_BALANCE',
            createdAt: new Date(Date.now() - 3600000 * 2)
        }
    });

    // 7. SEED BOUNTY BOARD
    console.log("🎯 Generating Active Smart Contract Bounties...");

    await prisma.bounty.create({
        data: {
            creatorId: buyer1.id,
            title: 'Best GPT-4o Math Reasoning Prompt',
            description: 'Looking for a robust system prompt that consistently solves complex AIME mathematics problems without falling into calculation loops or hallucinating logic steps. Must pass >90% of our hidden benchmark tests.',
            amount: 250.00,
            status: 'OPEN',
            escrowStatus: 'HELD',
            escrowAmount: 250.00,
            category: 'Math',
            tags: 'gpt-4o,reasoning,math',
            deadline: new Date(Date.now() + 7 * 24 * 3600000) // 7 days from now
        }
    });

    await prisma.bounty.create({
        data: {
            creatorId: admin.id,
            title: 'Open Source Security Hardener',
            description: 'Provide an overarching metaprompt that can take any javascript codebase and strictly output a list of critical CVE-level vulnerabilities in clear markdown with patching advice.',
            amount: 500.00,
            status: 'OPEN',
            escrowStatus: 'HELD',
            escrowAmount: 500.00,
            category: 'Cybersecurity',
            tags: 'security,javascript,metaprompt',
            deadline: new Date(Date.now() + 14 * 24 * 3600000) // 14 days from now
        }
    });

    console.log("==================================================");
    console.log("✅ SEED INJECTION SECURE & COMPLETE!");
    console.log("🚀 The PromptFeed database is now alive with genuine entities, ready to power the React/HTML interface without mock data.");
    console.log("==================================================");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed during transaction flow:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
