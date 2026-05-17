import { z } from 'zod';

// ============================================
// AUTH VALIDATORS
// ============================================

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().optional()
});

/**
 * User login validation schema
 */
export const loginSchema = z.object({
    emailOrUsername: z.string().min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required')
});

/**
 * Update user profile validation schema
 */
export const updateProfileSchema = z.object({
    fullName: z.string().optional(),
    bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional()
});

// ============================================
// PROMPT VALIDATORS
// ============================================

export const createPromptSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
    description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
    content: z.string().min(10, 'Content must be at least 10 characters'),
    category: z.string().max(50).optional(),
    tags: z.string().min(1, 'At least one tag is required').transform(v =>
        v.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',')
    ),
    isPremium: z.boolean().default(false),
    price: z.number().min(0).optional(),
    imageUrl: z.string().url('imageUrl must be a valid URL').optional().or(z.literal('')).transform(v => v || undefined),
    resourceUrl: z.string().url('resourceUrl must be a valid URL').optional().or(z.literal('')).transform(v => v || undefined)
});

export const updatePromptSchema = z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).optional(),
    content: z.string().min(10).optional(),
    category: z.string().max(50).optional(),
    tags: z.string().optional().transform(v =>
        v ? v.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',') : v
    ),
    isPremium: z.boolean().optional(),
    price: z.number().min(0).optional(),
    imageUrl: z.string().url('imageUrl must be a valid URL').optional().or(z.literal('')).transform(v => v || undefined),
    resourceUrl: z.string().url('resourceUrl must be a valid URL').optional().or(z.literal('')).transform(v => v || undefined)
});

// ============================================
// MARKETPLACE VALIDATORS
// ============================================

export const createProductSchema = z.object({
    promptId: z.string().uuid('Invalid prompt ID'),
    price: z.number().min(0.99, 'Minimum price is $0.99').max(999.99, 'Maximum price is $999.99'),
    currency: z.string().default('USD'),
    licenseType: z.string().optional()
});

export const purchaseSchema = z.object({
    productId: z.string().uuid('Invalid product ID')
});

// ============================================
// BOUNTY VALIDATORS
// ============================================

export const createBountySchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().max(5000).optional(),
    amount: z.number().min(5, 'Minimum bounty amount is $5'),
    currency: z.string().default('USD'),
    category: z.string().max(50).optional(),
    tags: z.string().min(1, 'At least one tag is required'),
    deadline: z.string().datetime().optional()
});

export const submitSolutionSchema = z.object({
    promptId: z.string().uuid('Invalid prompt ID')
});

// ============================================
// REVIEW VALIDATORS
// ============================================

export const createReviewSchema = z.object({
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
    comment: z.string().max(2000).optional()
});

// ============================================
// SUBSCRIPTION VALIDATORS
// ============================================

export const subscribeSchema = z.object({
    plan: z.enum(['free', 'pro', 'enterprise'], { message: 'Invalid plan type' })
});

// ============================================
// WALLET VALIDATORS
// ============================================

export const payoutSchema = z.object({
    amount: z.number().min(50, 'Minimum payout amount is $50'),
    payoutMethod: z.string().optional(),
    payoutDetails: z.string().optional()
});

// ============================================
// HELPER
// ============================================

/**
 * Validate request body against schema
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
export const validate = (schema, data) => {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        return {
            success: false,
            errors: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }))
        };
    }
};
