/**
 * Razorpay Payment Routes
 * Handles automated subscription payments via Razorpay
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

// All payment routes require authentication
router.use(authMiddleware);

/**
 * POST /api/payment/create-order
 * Create Razorpay order for subscription
 */
router.post('/create-order', paymentController.createOrder);

/**
 * POST /api/payment/verify
 * Verify payment and activate subscription
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * POST /api/payment/webhook
 * Razorpay webhook for payment events
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * GET /api/payment/status
 * Get current subscription status
 */
router.get('/status', paymentController.getSubscriptionStatus);

module.exports = router;