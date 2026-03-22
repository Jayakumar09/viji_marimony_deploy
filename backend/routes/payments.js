/**
 * Payment Routes
 * 
 * Manual payment API endpoints:
 * - Bank Transfer payments
 * - UPI payments
 * - Payment proof upload
 * - Admin verification
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

const express = require('express');
const router = express.Router();

// Import controller
const manualPaymentController = require('../controllers/manualPaymentController');

// Import middleware
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============

/**
 * GET /api/payments/plans
 * Get all subscription plans (public)
 */
router.get('/plans', manualPaymentController.getPlans);

/**
 * GET /api/payments/bank-details
 * Get bank details for manual transfer (public)
 */
router.get('/bank-details', manualPaymentController.getBankDetails);

/**
 * GET /api/payments/upi-details
 * Get UPI details for payment (public)
 */
router.get('/upi-details', manualPaymentController.getUPIDetails);

/**
 * GET /api/payments/upi-qr
 * Get UPI QR code image (public)
 */
router.get('/upi-qr', manualPaymentController.getUPIQR);

// ============ USER ROUTES (Authentication Required) ============

/**
 * POST /api/payments/initiate
 * Initiate a manual payment
 */
router.post('/initiate', authMiddleware, manualPaymentController.initiatePayment);

/**
 * POST /api/payments/submit-proof
 * Upload payment proof
 */
router.post(
  '/submit-proof',
  authMiddleware,
  manualPaymentController.getUploadMiddleware(),
  manualPaymentController.submitPaymentProof
);

/**
 * GET /api/payments/history
 * Get user's payment history
 */
router.get('/history', authMiddleware, manualPaymentController.getPaymentHistory);

/**
 * GET /api/payments/user/notifications
 * Get user's payment notifications
 */
router.get('/user/notifications', authMiddleware, manualPaymentController.getUserPaymentNotifications);

// ============ ADMIN ROUTES (Admin Authentication Required) ============
// Note: Admin routes must come BEFORE /:id routes to avoid route conflicts

/**
 * GET /api/payments/admin/all
 * Get all payments (Admin)
 */
router.get('/admin/all', adminAuthMiddleware, manualPaymentController.getAdminPayments);

/**
 * GET /api/payments/admin/stats
 * Get payment statistics (Admin)
 */
router.get('/admin/stats', adminAuthMiddleware, manualPaymentController.getPaymentStats);

/**
 * GET /api/payments/admin/notifications
 * Get admin notifications (Admin)
 */
router.get('/admin/notifications', adminAuthMiddleware, manualPaymentController.getAdminNotifications);

/**
 * POST /api/payments/admin/notifications/:id/read
 * Mark notification as read (Admin)
 */
router.post('/admin/notifications/:id/read', adminAuthMiddleware, manualPaymentController.markNotificationRead);

/**
 * POST /api/payments/admin/notifications/read-all
 * Mark all notifications as read (Admin)
 */
router.post('/admin/notifications/read-all', adminAuthMiddleware, manualPaymentController.markAllNotificationsRead);

/**
 * POST /api/payments/admin/:id/approve
 * Approve payment (Admin)
 */
router.post('/admin/:id/approve', adminAuthMiddleware, manualPaymentController.approvePayment);

/**
 * POST /api/payments/admin/:id/reject
 * Reject payment (Admin)
 */
router.post('/admin/:id/reject', adminAuthMiddleware, manualPaymentController.rejectPayment);

/**
 * POST /api/payments/admin/:id/messages
 * Send admin payment message (Admin)
 */
router.post('/admin/:id/messages', adminAuthMiddleware, manualPaymentController.sendAdminPaymentMessage);

/**
 * GET /api/payments/admin/:id/messages
 * Get payment messages (Admin)
 */
router.get('/admin/:id/messages', adminAuthMiddleware, manualPaymentController.getPaymentMessages);

// ============ PARAMETERIZED ROUTES (Must come AFTER specific routes) ============

/**
 * GET /api/payments/:id
 * Get payment details
 */
router.get('/:id', authMiddleware, manualPaymentController.getPaymentDetails);

/**
 * POST /api/payments/:id/cancel
 * Cancel a pending payment
 */
router.post('/:id/cancel', authMiddleware, manualPaymentController.cancelPayment);

/**
 * GET /api/payments/:id/messages
 * Get payment messages
 */
router.get('/:id/messages', authMiddleware, manualPaymentController.getPaymentMessages);

/**
 * POST /api/payments/:id/messages
 * Send payment message (User)
 */
router.post('/:id/messages', authMiddleware, manualPaymentController.sendPaymentMessage);

module.exports = router;
