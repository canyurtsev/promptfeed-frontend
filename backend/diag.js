import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const skills = await prisma.skill.findMany();
    const prompts = await prisma.prompt.findMany();
    console.log(JSON.stringify({
        skillIds: skills.map(s => s.id),
        promptIds: prompts.map(p => p.id),
        firstSkill: skills[0],
        firstPrompt: prompts[0]
    }, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
