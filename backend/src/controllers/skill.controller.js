import skillService from '../services/skill.service.js';
import { logger } from '../utils/logger.js';

class SkillController {
    async create(req, res, next) {
        try {
            const userId = req.user.id;
            const skillData = { ...req.body, userId };
            const skill = await skillService.createSkill(skillData);
            res.status(201).json({ success: true, data: skill });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const skills = await skillService.getSkills();
            res.json({ success: true, data: skills });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const skill = await skillService.getSkillById(req.params.id);
            res.json({ success: true, data: skill });
        } catch (error) {
            next(error);
        }
    }
}

export default new SkillController();
