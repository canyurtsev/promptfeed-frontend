import authService from '../services/auth.service.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';

/**
 * Auth Controller
 * Handles HTTP request/response for authentication endpoints
 */
class AuthController {
    async register(req, res) {
        const result = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    }

    async login(req, res) {
        const result = await authService.login(req.body);

        res.json({
            success: true,
            message: 'Login successful',
            data: result
        });
    }

    async logout(req, res) {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }

    async refresh(req, res) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const decoded = verifyRefreshToken(refreshToken);
        const user = await authService.getUserById(decoded.userId);
        const tokens = generateTokenPair(user);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens
        });
    }

    async getMe(req, res) {
        const user = await authService.getUserById(req.user.id);

        res.json({
            success: true,
            data: user
        });
    }
}

export default new AuthController();
