/**
 * Payment Utilities
 * 
 * Utility functions for payment processing:
 * - Reference ID generation
 * - Payment validation helpers
 * - Formatting utilities
 * 
 * @version 1.0.0
 */

const crypto = require('crypto');
const paymentConfig = require('../config/payments');

/**
 * Generate unique reference ID for bank transfers
 * Format: VBM-YYYYMMDD-XXXXX
 * Example: VBM-20260216-ABC12
 * 
 * Uses cryptographically secure random bytes for security.
 * 
 * @returns {string} Unique reference ID
 */
const generateReferenceId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  // Use 3 bytes (6 hex chars) for cryptographically secure random
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${paymentConfig.referenceId.prefix}-${dateStr}-${random}`;
};

/**
 * Generate order ID for internal tracking
 * Format: ORD-YYYYMMDD-XXXXXX
 * 
 * Uses cryptographically secure random bytes for uniqueness.
 * 
 * @returns {string} Unique order ID
 */
const generateOrderId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  // Use 4 bytes (8 hex chars) for cryptographically secure random
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

/**
 * Validate payment amount
 * @param {number} amount - Amount to validate
 * @returns {Object} Validation result
 */
const validateAmount = (amount) => {
  const { minAmount, maxAmount, currencyPrecision } = paymentConfig.validation;

  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount < minAmount) {
    return { valid: false, error: `Amount must be at least ₹${minAmount}` };
  }

  if (amount > maxAmount) {
    return { valid: false, error: `Amount cannot exceed ₹${maxAmount}` };
  }

  // Round to specified precision
  const roundedAmount = Math.round(amount * Math.pow(10, currencyPrecision)) / Math.pow(10, currencyPrecision);

  return { valid: true, amount: roundedAmount };
};

/**
 * Validate payment method
 * @param {string} method - Payment method to validate
 * @returns {Object} Validation result
 */
const validatePaymentMethod = (method) => {
  const validMethods = Object.values(paymentConfig.paymentMethods);

  if (!method || !validMethods.includes(method)) {
    return {
      valid: false,
      error: `Invalid payment method. Valid methods: ${validMethods.join(', ')}`
    };
  }

  return { valid: true, method };
};

/**
 * Validate verification type
 * @param {string} type - Verification type to validate
 * @returns {Object} Validation result
 */
const validateVerificationType = (type) => {
  const validTypes = Object.keys(paymentConfig.verificationPricing);

  if (!type || !validTypes.includes(type)) {
    return {
      valid: false,
      error: `Invalid verification type. Valid types: ${validTypes.join(', ')}`
    };
  }

  return {
    valid: true,
    type,
    price: paymentConfig.verificationPricing[type].price
  };
};

/**
 * Get verification pricing
 * @param {string} type - Verification type
 * @returns {Object|null} Pricing details or null if invalid
 */
const getVerificationPricing = (type) => {
  return paymentConfig.verificationPricing[type] || null;
};

/**
 * Get subscription plan details
 * @param {string} planId - Plan ID
 * @returns {Object|null} Plan details or null if invalid
 */
const getSubscriptionPlan = (planId) => {
  return paymentConfig.subscriptionPlans[planId] || null;
};

/**
 * Format amount for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
const formatAmount = (amount, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
};

/**
 * Calculate subscription end date
 * @param {number} durationDays - Duration in days
 * @returns {Date} End date
 */
const calculateSubscriptionEndDate = (durationDays) => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
};

/**
 * Check if subscription is active
 * @param {Object} subscription - Subscription object
 * @returns {boolean} Whether subscription is active
 */
const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  
  if (subscription.status !== 'ACTIVE') return false;
  
  if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
    return false;
  }

  return true;
};

/**
 * Get payment status label
 * @param {string} status - Payment status
 * @returns {string} Human-readable status
 */
const getPaymentStatusLabel = (status) => {
  const labels = {
    PENDING: 'Pending',
    SUCCESS: 'Successful',
    FAILED: 'Failed',
    PENDING_MANUAL: 'Awaiting Admin Approval',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded'
  };

  return labels[status] || status;
};

/**
 * Get verification badge text
 * @param {Object} verification - Verification object
 * @param {Object} payment - Payment object
 * @returns {string} Badge text
 */
const getVerificationBadge = (verification, payment) => {
  // If AI verification approved and payment successful
  if (verification?.aiStatus === 'APPROVE' && payment?.paymentStatus === 'SUCCESS') {
    return 'AI Verified (Paid)';
  }

  // If manual verification approved
  if (verification?.status === 'APPROVED') {
    return 'Manual Review';
  }

  // Default
  return 'Pending Verification';
};

/**
 * Mask account number for display
 * @param {string} accountNumber - Account number to mask
 * @returns {string} Masked account number
 */
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  return 'XXXX' + accountNumber.slice(-4);
};

/**
 * Generate payment receipt data
 * @param {Object} payment - Payment object
 * @param {Object} user - User object
 * @returns {Object} Receipt data
 */
const generateReceiptData = (payment, user) => {
  return {
    receiptId: payment.orderId,
    date: payment.createdAt,
    customer: {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone
    },
    payment: {
      amount: formatAmount(payment.amountINR, payment.currency),
      method: payment.paymentMethod,
      status: getPaymentStatusLabel(payment.paymentStatus),
      transactionId: payment.paymentId || payment.referenceId
    },
    bankDetails: payment.paymentMethod === 'BANK_TRANSFER' ? {
      referenceId: payment.referenceId,
      verifiedAt: payment.verifiedAt
    } : null
  };
};

/**
 * Validate bank transfer proof file
 * @param {Object} file - Uploaded file object
 * @returns {Object} Validation result
 */
const validatePaymentProof = (file) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  if (!file) {
    return { valid: false, error: 'Payment proof file is required' };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
    };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File size cannot exceed 5MB' };
  }

  return { valid: true };
};

/**
 * Get error response by code
 * @param {string} code - Error code
 * @returns {Object} Error response
 */
const getErrorByCode = (code) => {
  const message = paymentConfig.errorCodes[code] || 'Unknown error occurred';
  return { code, message };
};

/**
 * Sanitize payment data for logging (remove sensitive info)
 * @param {Object} payment - Payment object
 * @returns {Object} Sanitized payment data
 */
const sanitizePaymentForLog = (payment) => {
  const sanitized = { ...payment };
  
  // Remove sensitive fields
  delete sanitized.razorpaySignature;
  delete sanitized.paymentProof;
  
  // Mask IDs
  if (sanitized.paymentId) {
    sanitized.paymentId = sanitized.paymentId.slice(0, 8) + '...';
  }

  return sanitized;
};

module.exports = {
  generateReferenceId,
  generateOrderId,
  validateAmount,
  validatePaymentMethod,
  validateVerificationType,
  getVerificationPricing,
  getSubscriptionPlan,
  formatAmount,
  calculateSubscriptionEndDate,
  isSubscriptionActive,
  getPaymentStatusLabel,
  getVerificationBadge,
  maskAccountNumber,
  generateReceiptData,
  validatePaymentProof,
  getErrorByCode,
  sanitizePaymentForLog
};
