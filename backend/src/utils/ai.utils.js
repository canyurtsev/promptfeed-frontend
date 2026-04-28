import crypto from 'crypto';

/**
 * Normalizes prompt text for consistent matching and hashing
 */
export const normalizePrompt = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/[^\w\s]/gi, ''); // Optional: remove punctuation for better similarity
};

/**
 * Generates a SHA-256 hash of the normalized prompt
 */
export const generatePromptHash = (text) => {
    const normalized = normalizePrompt(text);
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Calculates string similarity using Dice's Coefficient
 * Returns a value between 0 and 1
 */
export const calculateSimilarity = (s1, s2) => {
    const n1 = normalizePrompt(s1);
    const n2 = normalizePrompt(s2);

    if (n1 === n2) return 1;
    if (n1.length < 2 || n2.length < 2) return 0;

    const bigrams1 = getBigrams(n1);
    const bigrams2 = getBigrams(n2);

    let intersection = 0;
    const set2 = new Set(bigrams2);

    for (const bigram of bigrams1) {
        if (set2.has(bigram)) {
            intersection++;
        }
    }

    return (2 * intersection) / (bigrams1.length + bigrams2.length);
};

/**
 * Helper to get bigrams from a string
 */
const getBigrams = (str) => {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
        bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
};

/**
 * Basic token optimization (whitespace, duplicate cleanup)
 */
export const optimizeTokens = (text) => {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .replace(/[ \t]+/g, ' '); // Clean horizontal whitespace
};
