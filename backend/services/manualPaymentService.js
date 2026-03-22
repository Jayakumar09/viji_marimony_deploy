/**
 * Manual Payment Service
 * 
 * Handles all manual payment operations:
 * - Bank Transfer payments
 * - UPI payments
 * - Payment verification by admin
 * 
 * @version 2.0.0 - Simplified Manual Payments
 */

const { prisma } = require('../utils/database');
const paymentConfig = require('../config/payments');

/**
 * Generate a unique order ID
 * @returns {string} Order ID
 */
const generateOrderId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${paymentConfig.referenceId.prefix}-${dateStr}-${randomStr}`;
};

/**
 * Get all subscription plans
 * @returns {Object} Plans object
 */
const getSubscriptionPlans = () => {
  return paymentConfig.subscriptionPlans;
};

/**
 * Get bank details for manual transfer
 * @returns {Object} Bank details
 */
const getBankDetails = () => {
  return paymentConfig.bankDetails;
};

/**
 * Get UPI details
 * @returns {Object} UPI details
 */
const getUPIDetails = () => {
  return paymentConfig.upiDetails;
};

/**
 * Initiate a manual payment
 * @param {Object} params - Payment parameters
 * @param {string} params.userId - User ID
 * @param {string} params.planId - Plan ID (BASIC, PRO, PREMIUM)
 * @param {string} params.paymentMethod - Payment method (BANK_TRANSFER, UPI)
 * @returns {Promise<Object>} Payment details
 */
const initiatePayment = async (params) => {
  const { userId, planId, paymentMethod } = params;

  // Validate plan
  const plan = paymentConfig.subscriptionPlans[planId];
  if (!plan || planId === 'FREE') {
    throw new Error('Invalid plan selected');
  }

  // Validate payment method
  if (!Object.values(paymentConfig.paymentMethods).includes(paymentMethod)) {
    throw new Error('Invalid payment method');
  }

  // Check for existing pending payment
  const existingPayment = await prisma.payments.findFirst({
    where: {
      userId,
      paymentStatus: {
        in: [paymentConfig.paymentStatus.PENDING, paymentConfig.paymentStatus.PENDING_VERIFICATION]
      }
    }
  });

  if (existingPayment) {
    return {
      success: false,
      message: 'You have a pending payment. Please wait for verification or cancel it.',
      existingPayment: {
        id: existingPayment.id,
        orderId: existingPayment.orderId,
        amount: existingPayment.amountINR,
        status: existingPayment.paymentStatus,
        planId: existingPayment.planId,
        planName: existingPayment.planName,
        paymentMethod: existingPayment.paymentMethod
      },
      // Include bank/UPI details for the existing payment
      bankDetails: paymentConfig.bankDetails,
      upiDetails: paymentConfig.upiDetails,
      instructions: [
        `Transfer ₹${existingPayment.amountINR} to the account above`,
        `Use Order ID: ${existingPayment.orderId} as payment reference`,
        'Upload screenshot of payment confirmation',
        'Admin will verify and activate your subscription'
      ]
    };
  }

  // Create payment record
  const orderId = generateOrderId();
  const payment = await prisma.payments.create({
    data: {
      userId,
      orderId,
      amountINR: plan.price,
      currency: 'INR',
      paymentMethod,
      paymentStatus: paymentConfig.paymentStatus.PENDING,
      planId: plan.id,
      planName: plan.name,
      planDuration: plan.duration
    }
  });

  // Return payment details based on method
  const response = {
    success: true,
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amountINR,
      planId: payment.planId,
      planName: payment.planName,
      planDuration: payment.planDuration,
      status: payment.paymentStatus
    }
  };

  if (paymentMethod === paymentConfig.paymentMethods.BANK_TRANSFER) {
    response.bankDetails = paymentConfig.bankDetails;
    response.instructions = [
      `Transfer ₹${plan.price} to the bank account above`,
      `Use Order ID: ${orderId} as payment reference`,
      'Upload payment proof (screenshot/receipt) after transfer',
      'Admin will verify and approve within 24-48 hours'
    ];
  } else if (paymentMethod === paymentConfig.paymentMethods.UPI) {
    response.upiDetails = {
      ...paymentConfig.upiDetails,
      qrCodeUrl: `/api/payments/upi-qr`
    };
    response.instructions = [
      `Pay ₹${plan.price} using UPI`,
      `Use Order ID: ${orderId} as payment reference`,
      'Upload payment screenshot after transfer',
      'Enter the UPI transaction ID',
      'Admin will verify and approve within 24-48 hours'
    ];
  }

  return response;
};

/**
 * Submit payment proof
 * @param {Object} params - Submission parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.userId - User ID
 * @param {string} params.transactionId - Transaction ID from payment
 * @param {string} params.paymentProof - URL/path to proof image
 * @param {Date} params.paymentDate - Date of payment
 * @returns {Promise<Object>} Update result
 */
const submitPaymentProof = async (params) => {
  const { paymentId, userId, transactionId, paymentProof, paymentDate } = params;

  // Get payment
  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
      userId
    }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Allow proof submission for PENDING or PENDING_VERIFICATION (resubmission)
  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING && 
      payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_VERIFICATION) {
    throw new Error(`Payment cannot be modified. Current status: ${payment.paymentStatus}`);
  }

  // Validate required fields
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }

  if (!paymentProof) {
    throw new Error('Payment proof is required');
  }

  // Update payment with proof and create notification
  const result = await prisma.$transaction([
    // Update payment with proof
    prisma.payments.update({
      where: { id: paymentId },
      data: {
        transactionId,
        paymentProof,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentStatus: paymentConfig.paymentStatus.PENDING_VERIFICATION,
        notes: 'Payment proof submitted by user'
      }
    }),
    // Create admin notification
    prisma.adminNotification.create({
      data: {
        type: 'PAYMENT_PENDING',
        title: 'New Payment Proof Submitted',
        message: `Payment proof submitted for Order ${payment.orderId}. Amount: ₹${payment.amountINR}`,
        paymentId: payment.id,
        userId: payment.userId
      }
    }),
    // Create initial payment message from user
    prisma.paymentMessage.create({
      data: {
        paymentId: payment.id,
        senderId: payment.userId,
        senderType: 'USER',
        message: `Payment proof submitted. Transaction ID: ${transactionId}. Please verify.`
      }
    })
  ]);

  const updatedPayment = result[0];

  return {
    success: true,
    message: 'Payment proof submitted successfully. Admin will verify within 24-48 hours.',
    payment: {
      id: updatedPayment.id,
      orderId: updatedPayment.orderId,
      status: updatedPayment.paymentStatus
    }
  };
};

/**
 * Get user's payment history
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment history
 */
const getUserPayments = async (userId) => {
  const payments = await prisma.payments.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return {
    payments: payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amountINR,
      planId: p.planId,
      planName: p.planName,
      method: p.paymentMethod,
      status: p.paymentStatus,
      transactionId: p.transactionId,
      paymentDate: p.paymentDate,
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt
    }))
  };
};

/**
 * Get payment details
 * @param {string} paymentId - Payment ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment details
 */
const getPaymentDetails = async (paymentId, userId) => {
  const payment = await prisma.payments.findFirst({
    where: { id: paymentId, userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      }
    }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  return {
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amountINR,
      planId: payment.planId,
      planName: payment.planName,
      planDuration: payment.planDuration,
      method: payment.paymentMethod,
      status: payment.paymentStatus,
      transactionId: payment.transactionId,
      paymentProof: payment.paymentProof,
      paymentDate: payment.paymentDate,
      rejectionReason: payment.rejectionReason,
      createdAt: payment.createdAt,
      verifiedAt: payment.verifiedAt
    }
  };
};

/**
 * Cancel a pending payment
 * @param {string} paymentId - Payment ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Cancel result
 */
const cancelPayment = async (paymentId, userId) => {
  const payment = await prisma.payments.findFirst({
    where: { id: paymentId, userId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Allow cancelling both PENDING and PENDING_VERIFICATION payments
  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING && 
      payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_VERIFICATION) {
    throw new Error('Only pending payments can be cancelled');
  }

  await prisma.payments.update({
    where: { id: paymentId },
    data: {
      paymentStatus: paymentConfig.paymentStatus.CANCELLED,
      notes: 'Cancelled by user'
    }
  });

  return {
    success: true,
    message: 'Payment cancelled successfully'
  };
};

// ============ ADMIN FUNCTIONS ============

/**
 * Get all pending payments (Admin)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} status - Filter by status
 * @returns {Promise<Object>} Pending payments
 */
const getAdminPayments = async (page = 1, limit = 20, status = null) => {
  const where = {};
  if (status) {
    where.paymentStatus = status;
  }

  const [payments, total] = await Promise.all([
    prisma.payments.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.payments.count({ where })
  ]);

  return {
    payments: payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amountINR,
      planId: p.planId,
      planName: p.planName,
      method: p.paymentMethod,
      status: p.paymentStatus,
      transactionId: p.transactionId,
      paymentProof: p.paymentProof,
      paymentDate: p.paymentDate,
      createdAt: p.createdAt,
      user: p.user
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Verify and approve payment (Admin)
 * @param {Object} params - Verification parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.adminId - Admin ID
 * @param {string} params.notes - Admin notes
 * @returns {Promise<Object>} Approval result
 */
const approvePayment = async (params) => {
  const { paymentId, adminId, notes } = params;

  const payment = await prisma.payments.findUnique({
    where: { id: paymentId },
    include: { user: true }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_VERIFICATION) {
    throw new Error('Payment is not awaiting verification');
  }

  // Calculate subscription end date
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + payment.planDuration);

  // Get user details for personalized message
  const userName = payment.user?.firstName || 'User';
  const amount = payment.amountINR;
  const txnId = payment.transactionId || payment.orderId;

  // Create admin note with transaction ID
  const adminNote = `Payment verified. Transaction ID ${txnId} confirmed. Premium access granted.`;

  // Create personalized success message for user
  const successMessage = `Hello ${userName}, your payment of ₹${amount} has been verified successfully. Your ${payment.planName} plan is now active until ${endDate.toLocaleDateString('en-IN')}. Welcome to Vijayalakshmi Boyar Matrimony! If you need further assistance, feel free to reach out. ${notes ? 'Note: ' + notes : ''}`;

  // Update payment and create subscription in transaction
  const result = await prisma.$transaction([
    // Update payment status
    prisma.payments.update({
      where: { id: paymentId },
      data: {
        paymentStatus: paymentConfig.paymentStatus.SUCCESS,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        adminNotes: adminNote
      }
    }),
    // Create subscription
    prisma.subscription.create({
      data: {
        userId: payment.userId,
        plan: payment.planId,
        amount: payment.amountINR,
        startDate,
        endDate,
        status: 'ACTIVE',
        paymentId: payment.id
      }
    }),
    // Update user subscription tier
    prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionTier: payment.planId,
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        isPremium: true
      }
    }),
    // Create admin notification for approval
    prisma.adminNotification.create({
      data: {
        type: 'PAYMENT_APPROVED',
        title: 'Payment Approved',
        message: `Payment for Order ${payment.orderId} has been approved. ${payment.planName} subscription activated.`,
        paymentId: payment.id,
        userId: payment.userId,
        isRead: true,
        readAt: new Date(),
        readBy: adminId
      }
    }),
    // Create payment message for user
    prisma.paymentMessage.create({
      data: {
        paymentId: payment.id,
        senderId: adminId,
        senderType: 'ADMIN',
        message: successMessage
      }
    })
  ]);

  return {
    success: true,
    message: 'Payment approved and subscription activated',
    payment: {
      id: result[0].id,
      status: result[0].paymentStatus
    },
    subscription: {
      plan: result[1].plan,
      endDate: result[1].endDate
    }
  };
};

/**
 * Reject payment (Admin)
 * @param {Object} params - Rejection parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.adminId - Admin ID
 * @param {string} params.reason - Rejection reason
 * @returns {Promise<Object>} Rejection result
 */
const rejectPayment = async (params) => {
  const { paymentId, adminId, reason } = params;

  if (!reason) {
    throw new Error('Rejection reason is required');
  }

  const payment = await prisma.payments.findUnique({
    where: { id: paymentId },
    include: { user: true }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_VERIFICATION) {
    throw new Error('Payment is not awaiting verification');
  }

  // Get user details for personalized message
  const userName = payment.user?.firstName || 'User';
  const txnId = payment.transactionId || payment.orderId;

  // Create rejection message with transaction ID
  const rejectionMessage = `Hello ${userName}, we regret to inform you that your payment with Transaction ID ${txnId} was not received or could not be verified. Reason: ${reason}. Please ensure the payment was successfully completed and submit a new payment proof with the correct transaction details. For assistance, please contact support.`;

  // Update payment and create notification in transaction
  const result = await prisma.$transaction([
    // Update payment status
    prisma.payments.update({
      where: { id: paymentId },
      data: {
        paymentStatus: paymentConfig.paymentStatus.REJECTED,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason
      }
    }),
    // Create admin notification for rejection
    prisma.adminNotification.create({
      data: {
        type: 'PAYMENT_REJECTED',
        title: 'Payment Rejected',
        message: `Payment for Order ${payment.orderId} has been rejected. Reason: ${reason}`,
        paymentId: payment.id,
        userId: payment.userId,
        isRead: true,
        readAt: new Date(),
        readBy: adminId
      }
    }),
    // Create payment message for user
    prisma.paymentMessage.create({
      data: {
        paymentId: payment.id,
        senderId: adminId,
        senderType: 'ADMIN',
        message: rejectionMessage
      }
    })
  ]);

  const updatedPayment = result[0];

  return {
    success: true,
    message: 'Payment rejected',
    payment: {
      id: updatedPayment.id,
      status: updatedPayment.paymentStatus,
      rejectionReason: updatedPayment.rejectionReason
    }
  };
};

/**
 * Get payment statistics (Admin)
 * @returns {Promise<Object>} Payment statistics
 */
const getPaymentStats = async () => {
  const stats = await prisma.$transaction([
    // Total payments
    prisma.payments.count(),
    // Successful payments
    prisma.payments.count({
      where: { paymentStatus: paymentConfig.paymentStatus.SUCCESS }
    }),
    // Pending verification
    prisma.payments.count({
      where: { paymentStatus: paymentConfig.paymentStatus.PENDING_VERIFICATION }
    }),
    // Pending payments
    prisma.payments.count({
      where: { paymentStatus: paymentConfig.paymentStatus.PENDING }
    }),
    // Rejected payments
    prisma.payments.count({
      where: { paymentStatus: paymentConfig.paymentStatus.REJECTED }
    }),
    // Total revenue
    prisma.payments.aggregate({
      where: { paymentStatus: paymentConfig.paymentStatus.SUCCESS },
      _sum: { amountINR: true }
    }),
    // Revenue by plan
    prisma.payments.groupBy({
      by: ['planId'],
      where: { paymentStatus: paymentConfig.paymentStatus.SUCCESS },
      _sum: { amountINR: true },
      _count: true
    })
  ]);

  return {
    total: stats[0],
    successful: stats[1],
    pendingVerification: stats[2],
    pending: stats[3],
    rejected: stats[4],
    totalRevenue: stats[5]._sum.amountINR || 0,
    revenueByPlan: stats[6].reduce((acc, item) => {
      acc[item.planId] = {
        revenue: item._sum.amountINR || 0,
        count: item._count
      };
      return acc;
    }, {})
  };
};

/**
 * Get admin notifications
 * @param {boolean} unreadOnly - Get only unread notifications
 * @param {number} limit - Limit number of results
 * @returns {Promise<Object>} Notifications
 */
const getAdminNotifications = async (unreadOnly = false, limit = 50) => {
  const where = {};
  if (unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.adminNotification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  const unreadCount = await prisma.adminNotification.count({
    where: { isRead: false }
  });

  return {
    notifications,
    unreadCount
  };
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Updated notification
 */
const markNotificationRead = async (notificationId, adminId) => {
  return await prisma.adminNotification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
      readBy: adminId
    }
  });
};

/**
 * Mark all notifications as read
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Update result
 */
const markAllNotificationsRead = async (adminId) => {
  const result = await prisma.adminNotification.updateMany({
    where: { isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
      readBy: adminId
    }
  });

  return { count: result.count };
};

/**
 * Get payment messages
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Messages
 */
const getPaymentMessages = async (paymentId) => {
  const messages = await prisma.paymentMessage.findMany({
    where: { paymentId },
    orderBy: { createdAt: 'asc' }
  });

  return { messages };
};

/**
 * Send payment message
 * @param {Object} params - Message parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.senderId - Sender ID
 * @param {string} params.senderType - Sender type (USER or ADMIN)
 * @param {string} params.message - Message content
 * @returns {Promise<Object>} Created message
 */
const sendPaymentMessage = async (params) => {
  const { paymentId, senderId, senderType, message } = params;

  if (!message || message.trim().length === 0) {
    throw new Error('Message content is required');
  }

  // Verify payment exists
  const payment = await prisma.payments.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Create message
  const newMessage = await prisma.paymentMessage.create({
    data: {
      paymentId,
      senderId,
      senderType,
      message: message.trim()
    }
  });

  // If admin sends message, create notification for user
  if (senderType === 'ADMIN') {
    await prisma.adminNotification.create({
      data: {
        type: 'PAYMENT_MESSAGE',
        title: 'New Message About Your Payment',
        message: `Admin sent a message about your payment: ${message.substring(0, 50)}...`,
        paymentId: payment.id,
        userId: payment.userId
      }
    });
  }

  return newMessage;
};

/**
 * Get user's payment notifications
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notifications
 */
const getUserPaymentNotifications = async (userId) => {
  const notifications = await prisma.adminNotification.findMany({
    where: {
      userId,
      type: { in: ['PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_MESSAGE'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return { notifications };
};

module.exports = {
  getSubscriptionPlans,
  getBankDetails,
  getUPIDetails,
  initiatePayment,
  submitPaymentProof,
  getUserPayments,
  getPaymentDetails,
  cancelPayment,
  // Admin functions
  getAdminPayments,
  approvePayment,
  rejectPayment,
  getPaymentStats,
  // Notification functions
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // Payment message functions
  getPaymentMessages,
  sendPaymentMessage,
  getUserPaymentNotifications
};
