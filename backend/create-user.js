
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@promptfeed.com';
    const username = 'admin';
    const password = 'password123';

    // Check if exists
    const exists = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
    });

    if (exists) {
        console.log('User admin already exists.');
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
            fullName: 'Admin User',
            role: 'ADMIN',
            emailVerified: true
        }
    });

    // Wallet
    await prisma.wallet.create({
        data: {
            userId: user.id
        }
    });

    console.log(`Created user: ${user.username} (${user.email})`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
