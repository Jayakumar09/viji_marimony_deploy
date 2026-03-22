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

// AI Verification Module
const aiVerification = require('../ai-verification');
const { aiStatusLimiter } = require('../middleware/aiRateLimit');

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

// AI Verification Status (public endpoint with rate limiting)
router.get('/ai/status', aiStatusLimiter, (req, res) => {
  try {
    const status = aiVerification.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

// Get supported ID types
router.get('/ai/id-types', aiStatusLimiter, (req, res) => {
  try {
    const idTypes = aiVerification.getSupportedIdTypes();
    res.json({ idTypes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get ID types' });
  }
});

module.exports = router;
