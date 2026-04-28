/**
 * Serialization Utilities
 * Ensures data consistency for API responses
 */

/**
 * Recursively converts all Decimal fields in an object/array to strings
 * @param {any} data - The data to serialize
 * @returns {any} - The serialized data
 */
export const serializeDecimals = (data) => {
    if (data === null || data === undefined) return data;

    // Handle Array
    if (Array.isArray(data)) {
        return data.map(item => serializeDecimals(item));
    }

    // Handle non-objects
    if (typeof data !== 'object') {
        return data;
    }

    // Handle Date - Return as is, JSON.stringify handles it
    if (Object.prototype.toString.call(data) === '[object Date]') {
        return data;
    }

    // Handle Prisma Decimal
    if (data.constructor && data.constructor.name === 'Decimal') {
        return data.toString();
    }

    // Handle anything with toFixed (Duck typing for Decimal)
    if (typeof data.toFixed === 'function') {
        return data.toString();
    }

    // Handle standard objects and Prisma model instances
    const serialized = {};
    const entries = Object.entries(data);
    
    // If no entries (like an empty object or a special type we missed), 
    // we should check if it's something we should have returned as-is
    if (entries.length === 0 && data.constructor !== Object) {
        return data;
    }

    for (const [key, value] of entries) {
        serialized[key] = serializeDecimals(value);
    }
    
    return serialized;
};
