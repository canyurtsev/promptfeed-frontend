import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("🛡️ Starting Minimal Production Database Seed...");

    // 1. Check for existing admin
    const existingAdmin = await prisma.user.findFirst({
        where: { email: 'admin@promptfeed.com' }
    });

    if (existingAdmin) {
        console.log("ℹ️ System administrator already exists. Skipping core seed.");
        return;
    }

    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10);

    // 2. Create System Admin
    console.log("👤 Creating System Administrator...");
    await prisma.user.create({
        data: {
            username: 'nexus_admin',
            email: 'admin@promptfeed.com',
            passwordHash,
            role: 'ADMIN',
            fullName: 'Nexus Administrator',
            wallet: { create: { balance: 0, totalEarnings: 0 } }
        }
    });

    console.log("==================================================");
    console.log("✅ PRODUCTION SEED COMPLETE!");
    console.log("🚀 System is initialized with core admin identity.");
    console.log("==================================================");
}

main()
    .catch((e) => {
        console.error("❌ Production seeding failed:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
