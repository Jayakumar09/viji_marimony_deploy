/**
 * Razorpay Payment Service
 * Handles subscription payment processing
 */

const crypto = require('crypto');

// Mock Razorpay client (will use real one if key available)
let razorpayInstance = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Free Plan',
    amount: 0,
    duration: 365, // days
    features: ['Basic profile', 'View matches'],
    maxInterestsPerMonth: 5
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium Plan',
    amount: 999, // in INR (paise for Razorpay)
    duration: 90, // days
    features: [
      'All Free features',
      'Unlimited chat',
      'View contact details',
      'Priority in searches',
      'Enhanced matching'
    ],
    maxInterestsPerMonth: -1 // unlimited
  },
  VIP: {
    id: 'VIP',
    name: 'VIP Plan',
    amount: 2499, // in INR
    duration: 180, // days
    features: [
      'All Premium features',
      'Featured profile',
      'Priority matching',
      'Dedicated support',
      'Profile verification badge',
      'AI matchmaking assistance'
    ],
    maxInterestsPerMonth: -1
  }
};

/**
 * Get subscription plan details
 * @param {string} planId - Plan identifier
 * @returns {Object} Plan details
 */
function getPlanDetails(planId) {
  const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }
  return plan;
}

/**
 * Create Razorpay order
 * @param {Object} options - Order options
 * @param {string} options.planId - Plan identifier
 * @param {number} options.amount - Amount in INR
 * @param {string} options.userId - User ID
 * @returns {Promise<Object>} Order details
 */
async function createOrder({ planId, amount, userId }) {
  if (!razorpayInstance) {
    // Mock order for development
    const receiptId = 'receipt_' + Date.now();
    return {
      id: 'order_' + Date.now(),
      receipt: receiptId,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      status: 'created',
      planId: planId,
      userId: userId,
      mock: true
    };
  }

  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency: 'INR',
    receipt: 'receipt_' + Date.now(),
    notes: {
      planId: planId,
      userId: userId
    }
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order: ' + error.message);
  }
}

/**
 * Verify payment signature
 * @param {Object} paymentData - Payment data from Razorpay
 * @returns {boolean} Verification result
 */
function verifyPaymentSignature(paymentData) {
  if (!razorpayInstance || !paymentData.razorpay_signature) {
    // In development, accept any signature
    return true;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
  
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  return generatedSignature === razorpay_signature;
}

/**
 * Process successful payment
 * @param {Object} paymentData - Payment data
 * @param {Object} user - User object
 * @returns {Promise<Object>} Subscription record
 */
async function processSuccessfulPayment(paymentData, user) {
  const { prisma } = require('../utils/database');
  
  const plan = getPlanDetails(paymentData.planId);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.duration);

  const subscription = await prisma.subscription.create({
    data: {
      userId: paymentData.userId,
      plan: plan.id,
      amount: parseFloat(paymentData.amount) / 100, // Convert back from paise
      startDate: now,
      endDate: endDate,
      status: 'ACTIVE',
      razorpayOrderId: paymentData.razorpay_order_id || null,
      razorpayPaymentId: paymentData.razorpay_payment_id || null,
      razorpaySubscriptionId: paymentData.razorpay_subscription_id || null
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          email: true,
          isPremium: true
        }
      }
    }
  });

  // Update user premium status
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPremium: true,
      subscriptionTier: plan.id,
      subscriptionStart: now,
      subscriptionEnd: endDate
    }
  });

  return subscription;
}

/**
 * Check if user has active subscription
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Has active subscription
 */
async function hasActiveSubscription(userId) {
  const subscription = await getActiveSubscription(userId);
  return !!subscription;
}

/**
 * Get user's active subscription
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Active subscription or null
 */
async function getActiveSubscription(userId) {
  const { prisma } = require('../utils/database');
  
  const now = new Date();
  
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      endDate: {
        gte: now
      }
    },
    orderBy: {
      endDate: 'desc'
    }
  });

  return subscription;
}

/**
 * Get user subscription status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Subscription status
 */
async function getSubscriptionStatus(userId) {
  const activeSubscription = await getActiveSubscription(userId);
  const { prisma } = require('../utils/database');
  
  const allSubscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    hasActive: !!activeSubscription,
    activePlan: activeSubscription ? activeSubscription.plan : 'FREE',
    activeSubscription: activeSubscription,
    allSubscriptions: allSubscriptions,
    planDetails: getPlanDetails(activeSubscription ? activeSubscription.plan : 'FREE')
  };
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlanDetails,
  createOrder,
  verifyPaymentSignature,
  processSuccessfulPayment,
  hasActiveSubscription,
  getActiveSubscription,
  getSubscriptionStatus
};