import { randomBytes } from 'crypto';
import prisma from '../config/database.js';
import { oauthConfig, isOAuthConfigured } from '../config/oauth.js';
import { ValidationError, UnauthorizedError, BadRequestError } from '../middleware/error.middleware.js';
import { generateTokenPair } from '../utils/jwt.js';
import oauthRepository from '../repositories/oauth.repository.js';

const STATE_EXPIRY_MINUTES = 15;
const CODE_EXPIRY_MINUTES = 5;

class OAuthService {
    /**
     * Generate provider authorization URL
     */
    async generateProviderAuthUrl(provider, returnUrl) {
        if (!isOAuthConfigured(provider)) {
            throw new BadRequestError(`${provider} OAuth is not configured`);
        }

        const config = oauthConfig[provider];

        if (returnUrl && !this.isValidReturnUrl(returnUrl)) {
            throw new ValidationError('Invalid return URL');
        }

        const state = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000);

        await oauthRepository.createState({
            state,
            provider,
            returnUrl: returnUrl || null,
            expiresAt
        });

        const authUrl = this.buildAuthUrl(provider, state, config);
        return { authUrl, state };
    }

    /**
     * Handle OAuth callback from provider
     */
    async handleProviderCallback(provider, code, state) {
        if (!isOAuthConfigured(provider)) {
            throw new BadRequestError(`${provider} OAuth is not configured`);
        }

        if (!state) {
            throw new ValidationError('Missing state parameter');
        }

        if (!code) {
            throw new ValidationError('Missing code parameter');
        }

        const oauthState = await oauthRepository.findByState(state);
        if (!oauthState) {
            throw new UnauthorizedError('Invalid state');
        }

        if (new Date() > oauthState.expiresAt) {
            throw new UnauthorizedError('State expired');
        }

        const config = oauthConfig[provider];
        const tokenData = await this.exchangeCodeForToken(provider, code, config);
        const profile = await this.fetchUserProfile(provider, tokenData.access_token, config);

        let email = profile.email;
        if (!email && provider === 'github') {
            email = await this.fetchGithubEmail(tokenData.access_token, config);
        }

        if (!email) {
            throw new BadRequestError('Could not obtain email from provider');
        }

        const existingOAuthAccount = await oauthRepository.findOAuthAccount(provider, profile.id);
        if (existingOAuthAccount) {
            return await this.handleExistingUser(existingOAuthAccount, oauthState, profile);
        }

        return await this.handleNewUser(provider, email, profile, oauthState);
    }

    /**
     * Exchange one-time code for JWT tokens
     */
    async exchangeOAuthCode(code) {
        if (!code) {
            throw new ValidationError('Missing code');
        }

        const oauthState = await oauthRepository.findByCode(code);
        if (!oauthState) {
            throw new UnauthorizedError('Invalid or expired code');
        }

        if (oauthState.codeUsed) {
            throw new UnauthorizedError('Code already used');
        }

        if (new Date() > oauthState.expiresAt) {
            throw new UnauthorizedError('Code expired');
        }

        if (!oauthState.userId) {
            throw new BadRequestError('No user associated with code');
        }

        await oauthRepository.markCodeUsed(oauthState.id);

        const tokens = await this.generateTokensForUser(oauthState.userId);

        return tokens;
    }

    /**
     * Internal: Build provider auth URL
     */
    buildAuthUrl(provider, state, config) {
        if (provider === 'google') {
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.callbackUrl,
                response_type: 'code',
                scope: config.scopes.join(' '),
                state,
                access_type: 'offline',
                prompt: 'consent'
            });
            return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        }

        if (provider === 'github') {
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: config.callbackUrl,
                scope: config.scopes.join(' '),
                state
            });
            return `https://github.com/login/oauth/authorize?${params}`;
        }

        throw new ValidationError(`Unknown provider: ${provider}`);
    }

    /**
     * Internal: Exchange authorization code for tokens
     */
    async exchangeCodeForToken(provider, code, config) {
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.callbackUrl
        });

        let tokenUrl, requestBody;

        if (provider === 'google') {
            tokenUrl = 'https://oauth2.googleapis.com/token';
            requestBody = params.toString();
        } else if (provider === 'github') {
            tokenUrl = 'https://github.com/login/oauth/access_token';
            requestBody = params.toString();
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': provider === 'github' ? 'application/json' : 'application/json'
            },
            body: requestBody
        });

        if (!response.ok) {
            const error = await response.text();
            throw new UnauthorizedError(`Failed to exchange code: ${error}`);
        }

        return response.json();
    }

    /**
     * Internal: Fetch user profile from provider
     */
    async fetchUserProfile(provider, accessToken, config) {
        let profileUrl;

        if (provider === 'google') {
            profileUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
        } else if (provider === 'github') {
            profileUrl = 'https://api.github.com/user';
        }

        const response = await fetch(profileUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new UnauthorizedError('Failed to fetch user profile');
        }

        const data = await response.json();

        if (provider === 'google') {
            return {
                id: data.sub,
                email: data.email,
                name: data.name,
                picture: data.picture
            };
        }

        if (provider === 'github') {
            return {
                id: String(data.id),
                email: data.email,
                name: data.name,
                login: data.login,
                avatar_url: data.avatar_url
            };
        }

        throw new ValidationError(`Unknown provider: ${provider}`);
    }

    /**
     * Internal: Fetch GitHub email (if not public)
     */
    async fetchGithubEmail(accessToken, config) {
        const response = await fetch('https://api.github.com/user/emails', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return null;
        }

        const emails = await response.json();
        const primary = emails.find(e => e.primary);
        return primary?.email || emails[0]?.email || null;
    }

    /**
     * Internal: Handle existing OAuth account user
     */
    async handleExistingUser(oauthAccount, oauthState, profile) {
        const user = await oauthRepository.findUserByEmail(oauthAccount.email);
        if (!user) {
            throw new BadRequestError('User not found for OAuth account');
        }

        const exchangeCode = randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

        await oauthRepository.updateStateCode(oauthState.id, exchangeCode);
        await prisma.oAuthState.update({
            where: { id: oauthState.id },
            data: { expiresAt, userId: user.id }
        });

        return {
            exchangeCode,
            returnUrl: oauthState.returnUrl,
            frontendUrl: oauthConfig.frontendUrl
        };
    }

    /**
     * Internal: Handle new user creation or linking
     */
    async handleNewUser(provider, email, profile, oauthState) {
        const existingUser = await oauthRepository.findUserByEmail(email);

        let user;
        if (existingUser) {
            user = existingUser;
        } else {
            const username = await this.generateUniqueUsername(provider, profile);
            user = await oauthRepository.createUser({
                email,
                username,
                passwordHash: null,
                fullName: profile.name || null,
                avatarUrl: profile.picture || profile.avatar_url || null,
                role: 'USER',
                emailVerified: true
            });

            const walletRepository = (await import('./wallet.repository.js')).default;
            await walletRepository.create({
                userId: user.id,
                balance: 0,
                totalEarnings: 0,
                totalSpent: 0,
                pendingPayouts: 0,
                lifetimePayouts: 0
            });
        }

        await oauthRepository.createOAuthAccount({
            userId: user.id,
            provider,
            providerId: profile.id,
            email,
            accessToken: null,
            refreshToken: null
        });

        const exchangeCode = randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

        await oauthRepository.updateStateCode(oauthState.id, exchangeCode);
        await prisma.oAuthState.update({
            where: { id: oauthState.id },
            data: { expiresAt, userId: user.id }
        });

        return {
            exchangeCode,
            returnUrl: oauthState.returnUrl,
            frontendUrl: oauthConfig.frontendUrl
        };
    }

    /**
     * Internal: Generate unique username
     */
    async generateUniqueUsername(provider, profile) {
        let baseUsername;
        if (provider === 'google') {
            baseUsername = (profile.name || profile.email?.split('@')[0] || 'user')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
        } else if (provider === 'github') {
            baseUsername = (profile.login || profile.email?.split('@')[0] || 'user')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
        }

        baseUsername = baseUsername || 'user';

        let username = baseUsername;
        let counter = 0;

        while (await oauthRepository.findByUsername(username)) {
            counter++;
            username = `${baseUsername}${counter}`.substring(0, 30);
        }

        return username;
    }

    /**
     * Internal: Generate JWT tokens for user
     */
    async generateTokensForUser(userId) {
        const userRepo = (await import('./user.repository.js')).default;
        const user = await userRepo.findByIdPublic(userId);

        if (!user) {
            throw new BadRequestError('User not found');
        }

        return generateTokenPair(user);
    }

    /**
     * Internal: Validate return URL
     */
    isValidReturnUrl(returnUrl) {
        if (!returnUrl) return true;

        try {
            const url = new URL(returnUrl);
            const frontendUrl = new URL(oauthConfig.frontendUrl);

            if (url.origin !== frontendUrl.origin) {
                return false;
            }

            const allowedPaths = ['/', '/signin.html', '/index.html', ''];
            const path = url.pathname.replace(/\.html$/, '');
            return allowedPaths.includes(path) || path.startsWith('/');
        } catch {
            return returnUrl.startsWith('/');
        }
    }
}

export default new OAuthService();