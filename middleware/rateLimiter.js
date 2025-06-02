const rateLimit = require('express-rate-limit');

// Login attempt limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Verification code request limiter
const verificationCodeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many verification code requests, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// Trade creation limiter
const tradeCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 trades per hour
    message: 'Too many trade requests, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    loginLimiter,
    verificationCodeLimiter,
    tradeCreationLimiter
}; 