import prisma from '../config/database.js';
import promptRepository from '../repositories/prompt.repository.js';
import { NotFoundError, ForbiddenError } from '../middleware/error.middleware.js';

/**
 * Version Service
 * Handles prompt versioning operations
 */
class VersionService {
    /**
     * Create a new version of a prompt
     */
    async create(promptId, userId, content, changelog = null) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');
        if (prompt.userId !== userId) throw new ForbiddenError('Only the prompt owner can create versions');

        // Get the latest version number
        const latestVersion = await prisma.promptVersion.findFirst({
            where: { promptId },
            orderBy: { version: 'desc' }
        });

        const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

        const version = await prisma.promptVersion.create({
            data: {
                promptId,
                version: newVersionNumber,
                content,
                changelog: changelog || null
            }
        });

        // Update the main prompt content
        await promptRepository.updateSimple(promptId, { content });

        return version;
    }

    /**
     * Get all versions of a prompt
     */
    async getByPrompt(promptId) {
        const prompt = await promptRepository.findByIdSimple(promptId);
        if (!prompt) throw new NotFoundError('Prompt not found');

        const versions = await prisma.promptVersion.findMany({
            where: { promptId },
            orderBy: { version: 'desc' }
        });
        return versions;
    }

    /**
     * Restore a prompt to a specific version
     */
    async restore(versionId, userId) {
        const version = await prisma.promptVersion.findUnique({
            where: { id: versionId },
            include: { prompt: true }
        });

        if (!version) throw new NotFoundError('Version not found');
        if (version.prompt.userId !== userId) throw new ForbiddenError('Only the prompt owner can restore versions');

        // Update main prompt content
        await promptRepository.updateSimple(version.promptId, { 
            content: version.content 
        });

        // Create a NEW version record for this restore (audit trail)
        return await this.create(version.promptId, userId, version.content, `Restored to v${version.version}`);
    }
}

export default new VersionService();
