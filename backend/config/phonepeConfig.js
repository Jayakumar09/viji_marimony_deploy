/**
 * PhonePe Payment Gateway Configuration
 * 
 * Configuration for PhonePe Standard Checkout API integration
 * Uses simple checksum-based authentication (same as working demo)
 * 
 * @version 2.0.0
 */

module.exports = {
  // PhonePe API Credentials
  merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86',
  merchantKey: process.env.PHONEPE_MERCHANT_KEY || '96434309-7796-489d-8924-ab56988a6076',
  
  // Environment Configuration
  environment: process.env.PHONEPE_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'

  // API URLs
  getBaseUrl() {
    return this.environment === 'production'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  },

  // Payment Endpoints
  getPaymentUrl() {
    return `${this.getBaseUrl()}/pg/v1/pay`;
  },

  getStatusUrl() {
    return `${this.getBaseUrl()}/pg/v1/status`;
  },

  // Application URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  // Callback Configuration
  callback: {
    path: '/api/phonepe/callback',
    redirectPath: '/payment/success'
  },

  // Get full callback URL
  getCallbackUrl() {
    return `${this.backendUrl}${this.callback.path}`;
  },

  // Get redirect URL for success page
  getRedirectUrl() {
    return `${this.backendUrl}/api/phonepe/redirect`;
  },

  // Get success URL for frontend
  getSuccessUrl() {
    return `${this.frontendUrl}/payment/success`;
  },

  // Get failure URL for frontend
  getFailureUrl() {
    return `${this.frontendUrl}/payment/failure`;
  },

  // Subscription Plans
  plans: {
    BASIC: {
      id: 'BASIC',
      name: 'Basic Plan',
      price: 19900, // Amount in paise (₹199)
      currency: 'INR',
      validity: 30, // days
      features: [
        'Basic profile visibility',
        '10 interests per day',
        'View contact details'
      ]
    },
    PRO: {
      id: 'PRO',
      name: 'Pro Plan',
      price: 49900, // Amount in paise (₹499)
      currency: 'INR',
      validity: 90, // days
      features: [
        'All Basic features',
        'Unlimited interests',
        'Priority listing',
        'AI verification included'
      ]
    },
    PREMIUM: {
      id: 'PREMIUM',
      name: 'Premium Plan',
      price: 99900, // Amount in paise (₹999)
      currency: 'INR',
      validity: 180, // days
      features: [
        'All Pro features',
        'Profile highlighting',
        'Dedicated support',
        'Advanced AI verification'
      ]
    }
  },

  // Verification Pricing
  verificationPricing: {
    BASIC_AI: {
      id: 'BASIC_AI',
      name: 'Basic AI Verification',
      price: 19900, // Amount in paise (₹199)
      currency: 'INR',
      features: [
        'Document format validation',
        'Basic face matching',
        'Tamper detection',
        'AI recommendation'
      ]
    },
    ADVANCED_AI: {
      id: 'ADVANCED_AI',
      name: 'Advanced AI Verification',
      price: 49900, // Amount in paise (₹499)
      currency: 'INR',
      features: [
        'Document format validation',
        'Advanced face matching (AWS Rekognition)',
        'Tamper detection',
        'AI recommendation',
        'Priority processing',
        'Detailed verification report'
      ]
    }
  },

  // Payment Modes
  paymentModes: {
    PAY_PAGE: {
      id: 'PAY_PAGE',
      name: 'All Payment Methods',
      type: 'ONLINE',
      description: 'Pay using any method - UPI, Card, Net Banking, Wallet'
    }
  },

  // Validation Settings
  validation: {
    minAmount: 100, // Minimum amount in paise (₹1)
    maxAmount: 10000000, // Maximum amount in paise (₹1,00,000)
    currencyPrecision: 2
  },

  // Payment Status Mapping
  statusMapping: {
    COMPLETED: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    PENDING: 'PENDING',
    PROCESSING: 'PENDING',
    'PAYMENT_SUCCESS': 'SUCCESS',
    'PAYMENT_ERROR': 'FAILED',
    'PAYMENT_PENDING': 'PENDING'
  },

  // Bank Transfer Details
  bankDetails: {
    accountHolderName: process.env.BANK_ACCOUNT_HOLDER_NAME || 'Account Holder',
    bankName: process.env.BANK_NAME || 'Bank Name',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'XXXXXXXXXXX',
    ifscCode: process.env.BANK_IFSC_CODE || 'XXXX0000000',
    branch: process.env.BANK_BRANCH || 'Branch',
    pinCode: process.env.BANK_PIN_CODE || '000000'
  },

  // Check if PhonePe is configured
  isConfigured() {
    return !!(this.merchantId && this.merchantKey);
  }
};
