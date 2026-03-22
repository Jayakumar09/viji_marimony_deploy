/**
 * Rate Limiting Middleware for AI Verification Endpoints
 * Prevents abuse and manages API costs for AI services
 */

const rateLimit = require('express-rate-limit');

// AI verification rate limiter - stricter limits due to AWS costs
const aiVerificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: parseInt(process.env.AI_RATE_LIMIT) || 10, // Max requests per minute
  message: {
    error: 'Too many AI verification requests',
    message: 'Please wait before submitting another verification request.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + user ID for rate limiting (more accurate for authenticated users)
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    return `${ip}:${userId}`;
  },
  // Skip successful requests from count (optional)
  skipSuccessfulRequests: false,
  // Skip failed requests from count
  skipFailedRequests: false,
  // Handler for when limit is exceeded
  handler: (req, res) => {
    console.log(`AI rate limit exceeded for ${req.ip} - User: ${req.user?.id || 'anonymous'}`);
    res.status(429).json({
      error: 'Too many AI verification requests',
      message: 'Please wait before submitting another verification request.',
      retryAfter: '1 minute'
    });
  }
});

// More lenient limiter for AI status checks
const aiStatusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 status checks per minute
  message: {
    error: 'Too many requests',
    message: 'Please wait before checking status again.'
  }
});

// Strict limiter for face comparison (expensive AWS operation)
const faceComparisonLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Only 5 face comparisons per minute
  message: {
    error: 'Too many face comparison requests',
    message: 'Face comparison is resource-intensive. Please wait before trying again.',
    retryAfter: '1 minute'
  },
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    return `face:${ip}:${userId}`;
  }
});

// OCR limiter (Tesseract is CPU intensive)
const ocrLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 OCR requests per minute
  message: {
    error: 'Too many OCR requests',
    message: 'Document processing is resource-intensive. Please wait.',
    retryAfter: '1 minute'
  }
});

// Daily limit for AI verifications (prevent abuse)
const dailyVerificationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // Max 50 verifications per day per user
  message: {
    error: 'Daily verification limit exceeded',
    message: 'You have reached the maximum number of verification attempts for today.',
    retryAfter: '24 hours'
  },
  keyGenerator: (req) => {
    // Use user ID for daily limit
    return `daily:${req.user?.id || req.ip}`;
  }
});

// Combined middleware for full AI verification
const aiVerificationRateLimit = [aiVerificationLimiter, dailyVerificationLimiter];

module.exports = {
  aiVerificationLimiter,
  aiStatusLimiter,
  faceComparisonLimiter,
  ocrLimiter,
  dailyVerificationLimiter,
  aiVerificationRateLimit
};
