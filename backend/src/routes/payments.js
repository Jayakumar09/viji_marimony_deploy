/**
 * Payment Routes for Cloudflare Worker
 */

import { Hono } from 'hono';
import { getPrisma } from '../lib/db.js';
import jwt from 'jsonwebtoken';

const paymentRoutes = new Hono();

const getJwtSecret = () => process.env.JWT_SECRET || globalThis.JWT_SECRET || 'fallback-secret';

const authenticate = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    c.set('userId', decoded.userId);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Create payment order
paymentRoutes.post('/create-order', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { amount, planId, planName, planDuration, paymentMethod } = body;

    if (!amount || !paymentMethod) {
      return c.json({ error: 'Amount and payment method required' }, 400);
    }

    const prisma = getPrisma();

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payment = await prisma.payments.create({
      data: {
        userId,
        orderId,
        amountINR: amount,
        paymentMethod,
        planId,
        planName,
        planDuration,
        paymentStatus: 'PENDING'
      }
    });

    return c.json({ 
      orderId: payment.orderId,
      amount: payment.amountINR,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('Create order error:', error);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

// Verify payment (webhook callback)
paymentRoutes.post('/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { orderId, paymentId, status } = body;

    if (!orderId) {
      return c.json({ error: 'Order ID required' }, 400);
    }

    const prisma = getPrisma();

    const payment = await prisma.payments.update({
      where: { orderId },
      data: {
        paymentId,
        paymentStatus: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
      }
    });

    // If payment successful, update user premium status
    if (status === 'SUCCESS' && payment.planId) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          isPremium: true,
          subscriptionTier: payment.planId,
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + (payment.planDuration || 30) * 24 * 60 * 60 * 1000)
        }
      });
    }

    return c.json({ message: 'Payment verified', status: payment.paymentStatus });

  } catch (error) {
    console.error('Verify payment error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// Get payment history
paymentRoutes.get('/history', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const prisma = getPrisma();

    const payments = await prisma.payments.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return c.json({ payments });

  } catch (error) {
    console.error('Get payment history error:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

// Submit manual payment proof (bank transfer/UPI)
paymentRoutes.post('/manual', authenticate, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { transactionId, paymentProof, paymentDate, amount, paymentMethod } = body;

    if (!transactionId || !amount || !paymentMethod) {
      return c.json({ error: 'Transaction ID, amount, and payment method required' }, 400);
    }

    const prisma = getPrisma();

    // Find pending payment or create new
    let payment = await prisma.payments.findFirst({
      where: { userId, paymentStatus: 'PENDING', amountINR: amount }
    });

    if (!payment) {
      const orderId = `ORD-MANUAL-${Date.now()}`;
      payment = await prisma.payments.create({
        data: {
          userId,
          orderId,
          amountINR: amount,
          paymentMethod,
          paymentStatus: 'PENDING_VERIFICATION'
        }
      });
    }

    // Update with transaction details
    payment = await prisma.payments.update({
      where: { id: payment.id },
      data: {
        transactionId,
        paymentProof,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentStatus: 'PENDING_VERIFICATION'
      }
    });

    return c.json({ message: 'Payment submitted for verification', payment });

  } catch (error) {
    console.error('Submit manual payment error:', error);
    return c.json({ error: 'Failed to submit payment' }, 500);
  }
});

// Admin: Get all payments
paymentRoutes.get('/admin/all', async (c) => {
  try {
    const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
    
    if (!adminToken) {
      return c.json({ error: 'Admin token required' }, 401);
    }

    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const status = c.req.query('status');

    const prisma = getPrisma();

    const where = {};
    if (status) where.paymentStatus = status;

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.payments.count({ where })
    ]);

    return c.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

// Admin: Verify manual payment
paymentRoutes.put('/admin/verify/:id', async (c) => {
  try {
    const adminToken = c.req.header('admin-token') || c.req.header('x-admin-token');
    
    if (!adminToken) {
      return c.json({ error: 'Admin token required' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, notes } = body; // 'SUCCESS' or 'REJECTED'

    const prisma = getPrisma();

    const payment = await prisma.payments.update({
      where: { id },
      data: {
        paymentStatus: status,
        adminNotes: notes
      }
    });

    // If approved, update user premium
    if (status === 'SUCCESS') {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          isPremium: true,
          subscriptionTier: payment.planId || 'PREMIUM',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + (payment.planDuration || 30) * 24 * 60 * 60 * 1000)
        }
      });
    }

    return c.json({ message: `Payment ${status.toLowerCase()}`, payment });

  } catch (error) {
    console.error('Verify payment error:', error);
    return c.json({ error: 'Failed to verify payment' }, 500);
  }
});

export default paymentRoutes;
