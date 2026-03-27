/**
 * Manual Payment Controller
 * 
 * Handles all manual payment HTTP requests:
 * - Bank Transfer payments
 * - UPI payments
 * - Payment proof upload
 * - Admin verification
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

const manualPaymentService = require('../services/manualPaymentService');
const paymentConfig = require('../config/payments');
const { upload } = require('../utils/upload');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/payments/plans
 * Get all subscription plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = manualPaymentService.getSubscriptionPlans();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
};

/**
 * GET /api/payments/bank-details
 * Get bank details for manual transfer
 */
const getBankDetails = async (req, res) => {
  try {
    const bankDetails = manualPaymentService.getBankDetails();
    res.json({
      success: true,
      bankDetails
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({ error: 'Failed to get bank details' });
  }
};

/**
 * GET /api/payments/upi-details
 * Get UPI details for payment
 */
const getUPIDetails = async (req, res) => {
  try {
    const upiDetails = manualPaymentService.getUPIDetails();
    res.json({
      success: true,
      upiDetails: {
        ...upiDetails,
        qrCodeUrl: `/api/payments/upi-qr`
      }
    });
  } catch (error) {
    console.error('Get UPI details error:', error);
    res.status(500).json({ error: 'Failed to get UPI details' });
  }
};

/**
 * GET /api/payments/upi-qr
 * Serve UPI QR code image
 */
const getUPIQR = async (req, res) => {
  try {
    const qrPath = path.join(__dirname, '../../UPI Image/UPI_image_1765686230111.png');
    
    if (!fs.existsSync(qrPath)) {
      return res.status(404).json({ error: 'QR code image not found' });
    }
    
    res.sendFile(qrPath);
  } catch (error) {
    console.error('Get UPI QR error:', error);
    res.status(500).json({ error: 'Failed to get UPI QR code' });
  }
};

/**
 * POST /api/payments/initiate
 * Initiate a manual payment
 */
const initiatePayment = async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!planId || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Plan ID and payment method are required' 
      });
    }

    const result = await manualPaymentService.initiatePayment({
      userId,
      planId,
      paymentMethod
    });

    res.json(result);
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/submit-proof
 * Submit payment proof
 */
const submitPaymentProof = async (req, res) => {
  try {
    const { paymentId, transactionId, paymentDate } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Payment proof file is required' });
    }

    // Get the URL - could be Cloudinary URL or local path
    // req.file.path contains the path, if it starts with 'http' it's a Cloudinary URL
    let proofUrl = req.file.path || req.file.filename;
    
    // If it's not a full URL, make it a proper path
    if (!proofUrl.startsWith('http')) {
      // Check if it's a cloudinary path (contains cloudinary.com)
      if (proofUrl.includes('cloudinary')) {
        // Already a cloudinary URL, keep as is
      } else if (proofUrl.startsWith('/uploads/')) {
        proofUrl = proofUrl; // Keep as /uploads/...
      } else {
        proofUrl = `/uploads/${path.basename(proofUrl)}`;
      }
    }

    console.log('[PaymentProof] Uploaded file info:', { path: req.file.path, filename: req.file.filename, url: proofUrl });

    const result = await manualPaymentService.submitPaymentProof({
      paymentId,
      userId,
      transactionId,
      paymentProof: proofUrl,
      paymentDate
    });

    res.json(result);
  } catch (error) {
    console.error('Submit proof error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/payments/history
 * Get user's payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await manualPaymentService.getUserPayments(userId);
    res.json(result);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

/**
 * GET /api/payments/:id
 * Get payment details
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await manualPaymentService.getPaymentDetails(id, userId);
    res.json(result);
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * POST /api/payments/:id/cancel
 * Cancel a pending payment
 */
const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await manualPaymentService.cancelPayment(id, userId);
    res.json(result);
  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * GET /api/payments/admin/all
 * Get all payments (Admin)
 */
const getAdminPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await manualPaymentService.getAdminPayments(
      parseInt(page),
      parseInt(limit),
      status
    );
    res.json(result);
  } catch (error) {
    console.error('Get admin payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
};

/**
 * GET /api/payments/admin/stats
 * Get payment statistics (Admin)
 */
const getPaymentStats = async (req, res) => {
  try {
    const result = await manualPaymentService.getPaymentStats();
    res.json(result);
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment statistics' });
  }
};

/**
 * POST /api/payments/admin/:id/approve
 * Approve payment (Admin)
 */
const approvePayment = async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    // Support both req.admin (from adminAuthMiddleware) and req.user (fallback)
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found in request' });
    }

    const result = await manualPaymentService.approvePayment({
      paymentId: id,
      adminId,
      notes
    });

    // Log the activity
    if (result.payment) {
      await prisma.adminActivityLog.create({
        data: {
          adminId,
          action: 'PAYMENT_APPROVED',
          targetUserId: result.payment.userId,
          details: JSON.stringify({
            paymentId: id,
            amount: result.payment.amount,
            paymentMethod: result.payment.paymentMethod,
            userEmail: result.payment.user?.email,
            notes: notes
          }),
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/admin/:id/reject
 * Reject payment (Admin)
 */
const rejectPayment = async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // Support both req.admin (from adminAuthMiddleware) and req.user (fallback)
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found in request' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await manualPaymentService.rejectPayment({
      paymentId: id,
      adminId,
      reason
    });

    // Log the activity
    if (result.payment) {
      await prisma.adminActivityLog.create({
        data: {
          adminId,
          action: 'PAYMENT_REJECTED',
          targetUserId: result.payment.userId,
          details: JSON.stringify({
            paymentId: id,
            amount: result.payment.amount,
            paymentMethod: result.payment.paymentMethod,
            userEmail: result.payment.user?.email,
            reason: reason
          }),
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/payments/admin/notifications
 * Get admin notifications (Admin)
 */
const getAdminNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const result = await manualPaymentService.getAdminNotifications(
      unreadOnly === 'true',
      50
    );
    res.json(result);
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

/**
 * POST /api/payments/admin/notifications/:id/read
 * Mark notification as read (Admin)
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?.id || req.user?.id;
    const result = await manualPaymentService.markNotificationRead(id, adminId);
    res.json(result);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/admin/notifications/read-all
 * Mark all notifications as read (Admin)
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const adminId = req.admin?.id || req.user?.id;
    const result = await manualPaymentService.markAllNotificationsRead(adminId);
    res.json(result);
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/payments/:id/messages
 * Get payment messages
 */
const getPaymentMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await manualPaymentService.getPaymentMessages(id);
    res.json(result);
  } catch (error) {
    console.error('Get payment messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

/**
 * POST /api/payments/:id/messages
 * Send payment message
 */
const sendPaymentMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await manualPaymentService.sendPaymentMessage({
      paymentId: id,
      senderId: userId,
      senderType: 'USER',
      message
    });

    res.json(result);
  } catch (error) {
    console.error('Send payment message error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/admin/:id/messages
 * Send admin payment message (Admin)
 */
const sendAdminPaymentMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    // Support both req.admin (from adminAuthMiddleware) and req.user (fallback)
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found in request' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await manualPaymentService.sendPaymentMessage({
      paymentId: id,
      senderId: adminId,
      senderType: 'ADMIN',
      message
    });

    res.json(result);
  } catch (error) {
    console.error('Send admin payment message error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/payments/user/notifications
 * Get user's payment notifications
 */
const getUserPaymentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await manualPaymentService.getUserPaymentNotifications(userId);
    res.json(result);
  } catch (error) {
    console.error('Get user payment notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Export multer upload middleware for 'proof' field
const getUploadMiddleware = () => multer.single('proof');

module.exports = {
  getPlans,
  getBankDetails,
  getUPIDetails,
  getUPIQR,
  initiatePayment,
  submitPaymentProof,
  getPaymentHistory,
  getPaymentDetails,
  cancelPayment,
  // Admin
  getAdminPayments,
  getPaymentStats,
  approvePayment,
  rejectPayment,
  // Admin notifications
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // Payment messages
  getPaymentMessages,
  sendPaymentMessage,
  sendAdminPaymentMessage,
  // User notifications
  getUserPaymentNotifications,
  // Middleware
  getUploadMiddleware
};
