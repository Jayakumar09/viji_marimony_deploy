const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { 
  sendOTPEmail, 
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
  getVerificationStatus
} = require('../controllers/verificationController');

// All routes require authentication
router.use(authMiddleware);

// Email verification
router.post('/email/send-otp', sendOTPEmail);
router.post('/email/verify', verifyEmailOTP);

// Phone verification
router.post('/phone/send-otp', sendPhoneOTP);
router.post('/phone/verify', verifyPhoneOTP);

// Get verification status
router.get('/status', getVerificationStatus);

module.exports = router;
