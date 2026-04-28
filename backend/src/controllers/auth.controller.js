import authService from '../services/auth.service.js';
import oauthService from '../services/oauth.service.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';
import { oauthConfig } from '../config/oauth.js';

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

    async initiateGoogle(req, res) {
        const { returnUrl } = req.query;

        try {
            const result = await oauthService.generateProviderAuthUrl('google', returnUrl);
            res.redirect(result.authUrl);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async handleGoogleCallback(req, res) {
        const { code, state } = req.query;

        try {
            const result = await oauthService.handleProviderCallback('google', code, state);

            const redirectUrl = new URL(`${result.frontendUrl}/signin.html`);
            redirectUrl.searchParams.set('oauthCode', result.exchangeCode);
            if (result.returnUrl) {
                redirectUrl.searchParams.set('returnUrl', result.returnUrl);
            }

            res.redirect(redirectUrl.toString());
        } catch (error) {
            const errorUrl = new URL(`${oauthConfig.frontendUrl}/signin.html`);
            errorUrl.searchParams.set('error', error.message);
            res.redirect(errorUrl.toString());
        }
    }

    async initiateGithub(req, res) {
        const { returnUrl } = req.query;

        try {
            const result = await oauthService.generateProviderAuthUrl('github', returnUrl);
            res.redirect(result.authUrl);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async handleGithubCallback(req, res) {
        const { code, state } = req.query;

        try {
            const result = await oauthService.handleProviderCallback('github', code, state);

            const redirectUrl = new URL(`${result.frontendUrl}/signin.html`);
            redirectUrl.searchParams.set('oauthCode', result.exchangeCode);
            if (result.returnUrl) {
                redirectUrl.searchParams.set('returnUrl', result.returnUrl);
            }

            res.redirect(redirectUrl.toString());
        } catch (error) {
            const errorUrl = new URL(`${oauthConfig.frontendUrl}/signin.html`);
            errorUrl.searchParams.set('error', error.message);
            res.redirect(errorUrl.toString());
        }
    }

    async exchangeOAuthCode(req, res) {
        const { code } = req.body;

        try {
            const tokens = await oauthService.exchangeOAuthCode(code);

            res.json({
                success: true,
                message: 'OAuth exchange successful',
                data: tokens
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new AuthController();
