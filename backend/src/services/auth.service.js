import userRepository from '../repositories/user.repository.js';
import walletRepository from '../repositories/wallet.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateTokenPair } from '../utils/jwt.js';
import { validate, registerSchema, loginSchema } from '../utils/validators.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../middleware/error.middleware.js';

/**
 * Authentication Service
 */
class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} User and tokens
     */
    async register(userData) {
        // Validate input
        const validation = validate(registerSchema, userData);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const { email, username, password, fullName } = validation.data;

        // Check if user already exists
        const existingUser = await userRepository.findExistingByEmailOrUsername(email, username);
        if (existingUser) {
            if (existingUser.email === email) {
                throw new ValidationError('Email already registered');
            }
            if (existingUser.username === username) {
                throw new ValidationError('Username already taken');
            }
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await userRepository.create({
            email,
            username,
            passwordHash,
            fullName: fullName || null,
            role: 'USER',
            emailVerified: false
        });

        // Create wallet for user
        await walletRepository.create({
            userId: user.id,
            balance: 0,
            totalEarnings: 0,
            totalSpent: 0,
            pendingPayouts: 0,
            lifetimePayouts: 0
        });

        // Generate tokens
        const tokens = generateTokenPair(user);

        return {
            user,
            ...tokens
        };
    }

    /**
     * Login user
     * @param {Object} credentials - Login credentials
     * @returns {Promise<Object>} User and tokens
     */
    async login(credentials) {
        // Validate input
        const validation = validate(loginSchema, credentials);
        if (!validation.success) {
            throw new ValidationError('Validation failed', validation.errors);
        }

        const { emailOrUsername, password } = validation.data;

        // Find user by email or username
        const user = await userRepository.findByEmailOrUsername(emailOrUsername);

        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            ...tokens
        };
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User object
     */
    async getUserById(userId) {
        const user = await userRepository.findByIdPublic(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return user;
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated user
     */
    async updateProfile(userId, updateData) {
        const user = await userRepository.update(userId, updateData);
        return user;
    }
}

export default new AuthService();
