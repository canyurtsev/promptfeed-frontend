import dotenv from 'dotenv';

dotenv.config();

const required = (key, fallback = null) => {
    const value = process.env[key] || fallback;
    if (!value) {
        console.warn(`⚠️  Missing required env: ${key}`);
    }
    return value;
};

export const oauthConfig = {
    google: {
        clientId: required('GOOGLE_CLIENT_ID'),
        clientSecret: required('GOOGLE_CLIENT_SECRET'),
        callbackUrl: required('GOOGLE_CALLBACK_URL', 'http://localhost:5000/api/auth/google/callback'),
        scopes: ['openid', 'email', 'profile']
    },
    github: {
        clientId: required('GITHUB_CLIENT_ID'),
        clientSecret: required('GITHUB_CLIENT_SECRET'),
        callbackUrl: required('GITHUB_CALLBACK_URL', 'http://localhost:5000/api/auth/github/callback'),
        scopes: ['read:user', 'user:email']
    },
    frontendUrl: required('FRONTEND_URL', 'http://localhost:8080')
};

export const isOAuthConfigured = (provider) => {
    const config = oauthConfig[provider];
    return !!(config.clientId && config.clientSecret);
};