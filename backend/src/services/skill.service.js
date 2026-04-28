import skillRepository from '../repositories/skill.repository.js';
import { logger } from '../utils/logger.js';
import { serializeDecimals } from '../utils/serialization.js';

class SkillService {
    async createSkill(data) {
        try {
            const skill = await skillRepository.create(data);
            return serializeDecimals(skill);
        } catch (error) {
            logger.error('Skill Service Create Error:', error);
            throw error;
        }
    }

    async getSkills() {
        const skills = await skillRepository.findAll();
        return serializeDecimals(skills);
    }

    async getSkillById(id) {
        const skill = await skillRepository.findById(id);
        if (!skill) throw new Error('Skill not found');
        return serializeDecimals(skill);
    }

    async getUserSkills(userId) {
        const skills = await skillRepository.findByUserId(userId);
        return serializeDecimals(skills);
    }
}

export default new SkillService();

