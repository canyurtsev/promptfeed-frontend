import userRepository from '../repositories/user.repository.js';

class UserController {
    async getMe(req, res, next) {
        try {
            const user = await userRepository.findById(req.user.id);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async getBookmarks(req, res, next) {
        try {
            const bookmarks = await userRepository.findBookmarks(req.user.id);
            res.json({ success: true, data: bookmarks });
        } catch (error) {
            next(error);
        }
    }

    async updateMe(req, res, next) {
        try {
            const user = await userRepository.update(req.user.id, req.body);
            res.json({ success: true, data: user, message: 'Profile updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const user = await userRepository.findById(req.params.id);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const user = await userRepository.findById(req.user.id);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const user = await userRepository.update(req.user.id, req.body);
            res.json({ success: true, data: user, message: 'Profile updated successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export default new UserController();
