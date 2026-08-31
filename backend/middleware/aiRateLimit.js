/**
 * AI API Rate Limiting Middleware
 * Protects AI endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * General AI API rate limiter
 */
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.AI_RATE_LIMIT ? parseInt(process.env.AI_RATE_LIMIT) : 10, // Limit each IP
  message: {
    error: 'Too many AI requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user.id : req.ip;
  }
});

/**
 * Strict AI API rate limiter for heavy operations
 */
const strictAiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.AI_RATE_LIMIT ? Math.floor(parseInt(process.env.AI_RATE_LIMIT) / 3) : 3,
  message: {
    error: 'Too many generation requests. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  }
});

module.exports = {
  aiRateLimiter,
  strictAiRateLimiter
};