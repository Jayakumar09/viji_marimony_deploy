/**
 * Payment Configuration
 * 
 * Manual Payment Settings for:
 * - Direct Bank Transfer
 * - UPI Payment
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

module.exports = {
  // Bank Transfer Details
  bankDetails: {
    accountHolderName: 'Vijayalakshmi',
    bankName: 'State Bank of India (SBI)',
    accountNumber: '42238903895',
    ifscCode: 'SBIN0064593',
    branchName: 'Uppiliapuram',
    pinCode: '621011'
  },

  // UPI Details
  upiDetails: {
    upiId: '7639150271@ptsbi',
    upiQrCodePath: '/UPI Image/UPI_image_1765686230111.png',
    payeeName: 'Vijayalakshmi'
  },

  // Subscription Plans (in INR)
  subscriptionPlans: {
    FREE: {
      id: 'FREE',
      name: 'Free',
      price: 0,
      duration: 0, // Unlimited
      successFee: 0,
      features: ['Basic profile creation', 'Limited searches', '5 interests per day']
    },
    BASIC: {
      id: 'BASIC',
      name: 'Basic',
      price: 1000,
      duration: 30, // days
      successFee: 25000,
      features: ['Basic profile visibility', '10 interests per day', 'View contact details']
    },
    PRO: {
      id: 'PRO',
      name: 'Pro',
      price: 2000,
      duration: 90, // days
      successFee: 50000,
      features: ['All Basic features', 'Unlimited interests', 'Priority listing', 'AI verification included']
    },
    PREMIUM: {
      id: 'PREMIUM',
      name: 'Premium',
      price: 5000,
      duration: 180, // days
      successFee: 100000,
      features: ['All Pro features', 'Profile highlighting', 'Dedicated support', 'Advanced AI verification']
    }
  },

  // Payment Status Constants
  paymentStatus: {
    PENDING: 'PENDING',                    // Payment initiated but not completed
    PENDING_VERIFICATION: 'PENDING_VERIFICATION', // User submitted, awaiting admin verification
    SUCCESS: 'SUCCESS',                    // Payment verified and approved
    FAILED: 'FAILED',                      // Payment failed
    REJECTED: 'REJECTED',                  // Admin rejected the payment
    CANCELLED: 'CANCELLED'                 // Cancelled by user
  },

  // Payment Methods
  paymentMethods: {
    BANK_TRANSFER: 'BANK_TRANSFER',
    UPI: 'UPI'
  },

  // Reference ID Configuration
  referenceId: {
    prefix: 'VBM', // Vijayalakshmi Boyar Matrimony
    format: 'VBM-YYYYMMDD-XXXXX' // Format: VBM-20260224-ABC12
  },

  // Payment Validation Settings
  validation: {
    minAmount: 1, // Minimum amount in INR
    maxAmount: 100000, // Maximum amount in INR (1 lakh)
    currencyPrecision: 2, // Decimal places for currency
    maxProofFileSize: 5 * 1024 * 1024, // 5MB max file size for proof
    allowedProofTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  },

  // Error Codes
  errorCodes: {
    PAY001: 'Payment required',
    PAY002: 'Payment verification failed',
    PAY003: 'Payment already processed',
    PAY004: 'Invalid payment method',
    PAY005: 'Payment proof required',
    PAY006: 'Transaction ID required',
    PAY007: 'Invalid plan selected',
    PAY008: 'Payment not found',
    PAY009: 'Unauthorized access',
    PAY010: 'Admin approval required'
  },

  // Audit Settings
  audit: {
    logAllPayments: true,
    logAdminActions: true,
    retentionDays: 2555 // 7 years as per RBI requirement
  }
};
