const { rateLimit } = require('express-rate-limit');

/**
 * Rate Limiter for Payment Endpoints
 * 
 * Protects against abuse and DDoS attacks on sensitive payment routes
 */

// General API rate limiter (100 requests per 15 minutes)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false
});

// Strict rate limiter for payment endpoints (10 requests per minute)
const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10,
    message: {
        error: 'Too many payment requests. Please wait before trying again.',
        retryAfter: '1 minute'
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false
    // Removed custom keyGenerator - defaults to IP-based limiting
});

// Very strict limiter for subscription creation (5 per hour)
const subscriptionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    message: {
        error: 'Subscription creation limit reached. Please try again later.',
        retryAfter: '1 hour'
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false
    // Removed custom keyGenerator - defaults to IP-based limiting
});

// Auth endpoints limiter (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 login attempts per 15 min
    message: {
        error: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

module.exports = {
    generalLimiter,
    paymentLimiter,
    subscriptionLimiter,
    authLimiter
};
