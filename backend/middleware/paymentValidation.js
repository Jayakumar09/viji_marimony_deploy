/**
 * Payment Validation Middleware
 * 
 * Validates payment status before allowing AI verification processing.
 * Checks for:
 * - Active subscription
 * - Successful verification payment
 * - Prevents bypassing payment requirement
 * 
 * @version 1.0.0
 */

const { prisma } = require('../utils/database');
const paymentConfig = require('../config/payments');

/**
 * Check if user has valid payment for AI verification
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment validation result
 */
const validatePaymentForAI = async (userId) => {
  // Check 1: Active Subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: { gte: new Date() }
    }
  });

  if (activeSubscription) {
    return {
      valid: true,
      paymentType: 'SUBSCRIPTION',
      details: {
        plan: activeSubscription.plan,
        endDate: activeSubscription.endDate,
        subscriptionId: activeSubscription.id
      }
    };
  }

  // Check 2: Successful Verification Payment
  const verificationPayment = await prisma.verificationPayments.findFirst({
    where: {
      userId,
      paymentStatus: paymentConfig.paymentStatus.SUCCESS
    },
    orderBy: { createdAt: 'desc' }
  });

  if (verificationPayment) {
    return {
      valid: true,
      paymentType: 'VERIFICATION_PAYMENT',
      details: {
        type: verificationPayment.verificationType,
        amount: verificationPayment.amount,
        paymentId: verificationPayment.id,
        createdAt: verificationPayment.createdAt
      }
    };
  }

  // Check 3: Pending Bank Transfer (allow limited access)
  const pendingBankTransfer = await prisma.payments.findFirst({
    where: {
      userId,
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER,
      paymentStatus: paymentConfig.paymentStatus.PENDING_MANUAL
    }
  });

  if (pendingBankTransfer) {
    return {
      valid: false,
      paymentType: 'PENDING_BANK_TRANSFER',
      requiresPayment: true,
      message: 'Your bank transfer is pending admin approval. Please wait for verification.',
      details: {
        referenceId: pendingBankTransfer.referenceId,
        amount: pendingBankTransfer.amountINR,
        hasProof: !!pendingBankTransfer.paymentProof
      }
    };
  }

  // No valid payment found
  return {
    valid: false,
    paymentType: null,
    requiresPayment: true,
    message: 'Payment required for AI verification. Please complete payment to proceed.'
  };
};

/**
 * Middleware to require payment before AI verification
 * Use this middleware before AI processing endpoints
 */
const requirePaymentForAI = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const validation = await validatePaymentForAI(userId);

    if (validation.valid) {
      // Add payment info to request for downstream use
      req.paymentInfo = validation;
      return next();
    }

    // Payment required - return 402 Payment Required
    return res.status(402).json({
      error: 'Payment required',
      message: validation.message,
      requiresPayment: true,
      paymentType: validation.paymentType,
      details: validation.details,
      pricing: paymentConfig.verificationPricing
    });

  } catch (error) {
    console.error('Payment validation error:', error);
    return res.status(500).json({
      error: 'Payment validation failed',
      message: 'Unable to verify payment status. Please try again.'
    });
  }
};

/**
 * Middleware to check payment status (non-blocking)
 * Adds payment info to request but doesn't block
 */
const checkPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const validation = await validatePaymentForAI(userId);
    req.paymentInfo = validation;
    next();
  } catch (error) {
    console.error('Payment status check error:', error);
    req.paymentInfo = { valid: false, error: error.message };
    next();
  }
};

/**
 * Middleware for admin-only payment operations
 */
const requireAdminForPayment = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only administrators can perform this action'
    });
  }
  next();
};

/**
 * Validate payment ownership
 * Ensures user can only access their own payments
 */
const validatePaymentOwnership = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      select: { userId: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this payment'
      });
    }

    next();
  } catch (error) {
    console.error('Payment ownership validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
};

/**
 * Prevent duplicate payment processing
 */
const preventDuplicatePayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { verificationType } = req.body;

    // Check for existing successful payment for same verification type
    const existingPayment = await prisma.verificationPayments.findFirst({
      where: {
        userId,
        verificationType,
        paymentStatus: paymentConfig.paymentStatus.SUCCESS
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        error: 'Duplicate payment',
        message: 'You already have a successful payment for this verification type',
        existingPayment: {
          id: existingPayment.id,
          type: existingPayment.verificationType,
          createdAt: existingPayment.createdAt
        }
      });
    }

    next();
  } catch (error) {
    console.error('Duplicate payment check error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
};

/**
 * Rate limit payment attempts
 * Prevents abuse of payment endpoints
 * 
 * IMPORTANT: This in-memory implementation is suitable for single-instance deployments.
 * For production with multiple server instances (load-balanced), use a Redis-based
 * rate limiter to ensure consistent rate limiting across all instances.
 * 
 * Example Redis implementation:
 * ```javascript
 * const RateLimit = require('express-rate-limit');
 * const RedisStore = require('rate-limit-redis');
 * const redis = require('redis');
 * 
 * const redisClient = redis.createClient({ url: process.env.REDIS_URL });
 * 
 * const limiter = RateLimit({
 *   store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
 *   windowMs: 60000,
 *   max: 5,
 *   keyGenerator: (req) => req.user.id
 * });
 * ```
 */
const paymentRateLimit = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of paymentRateLimit.entries()) {
    // Remove entries older than 1 hour
    if (now - data.lastAccess > 60 * 60 * 1000) {
      paymentRateLimit.delete(userId);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL);

const rateLimitPaymentAttempts = (maxAttempts = 5, windowMs = 60000) => {
  return (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user rate limit data
    let userData = paymentRateLimit.get(userId);
    
    if (!userData) {
      userData = { attempts: [], lastAccess: now };
      paymentRateLimit.set(userId, userData);
    }
    
    // Update last access time
    userData.lastAccess = now;
    
    // Remove old attempts outside the window
    userData.attempts = userData.attempts.filter(
      timestamp => timestamp > windowStart
    );

    // Check if limit exceeded
    if (userData.attempts.length >= maxAttempts) {
      const oldestAttempt = userData.attempts[0];
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Please wait before making another payment attempt',
        retryAfter: Math.max(1, retryAfter)
      });
    }

    // Record this attempt
    userData.attempts.push(now);
    next();
  };
};

/**
 * Validate payment amount matches pricing
 */
const validatePaymentAmount = async (req, res, next) => {
  try {
    const { verificationType, amount } = req.body;

    if (!verificationType) {
      return res.status(400).json({ error: 'Verification type is required' });
    }

    const pricing = paymentConfig.verificationPricing[verificationType];
    
    if (!pricing) {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    // If amount provided, verify it matches
    if (amount && amount !== pricing.price) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: `Amount should be ₹${pricing.price} for ${verificationType}`,
        expectedAmount: pricing.price
      });
    }

    req.pricing = pricing;
    next();
  } catch (error) {
    console.error('Payment amount validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
};

module.exports = {
  validatePaymentForAI,
  requirePaymentForAI,
  checkPaymentStatus,
  requireAdminForPayment,
  validatePaymentOwnership,
  preventDuplicatePayment,
  rateLimitPaymentAttempts,
  validatePaymentAmount
};
