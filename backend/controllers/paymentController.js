/**
 * Razorpay Payment Controller
 * Handles subscription payments via Razorpay
 */

const crypto = require('crypto');
const { prisma } = require('../utils/database');
const { getPlanDetails, createOrder, verifyPaymentSignature, processSuccessfulPayment, getSubscriptionStatus } = require('../services/paymentService');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

/**
 * Create Razorpay order for subscription
 */
async function createOrderHandler(req, res) {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const plan = getPlanDetails(planId);

    // Create order
    const order = await createOrder({
      planId: plan.id,
      amount: plan.amount,
      userId: userId
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        planId: plan.id,
        planName: plan.name,
        mock: order.mock || false
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
}

/**
 * Verify payment and activate subscription
 */
async function verifyPaymentHandler(req, res) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      planId 
    } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment verification data' 
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ 
        error: 'Invalid payment signature' 
      });
    }

    // Process payment and create subscription
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await processSuccessfulPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId: planId,
      amount: req.body.amount || 0,
      userId: userId
    }, user);

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          amount: subscription.amount,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          status: subscription.status
        },
        user: {
          id: user.id,
          firstName: user.firstName,
          isPremium: true
        }
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
}

/**
 * Handle Razorpay webhook events
 */
async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || !webhookSecret) {
      return res.status(400).json({ error: 'Webhook configuration missing' });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;

    // Handle different event types
    switch (event.event) {
      case 'order.paid':
        await handleOrderPaid(event.payload);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.payload);
        break;
      default:
        console.log(`Unhandled event: ${event.event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(payload) {
  const { entity } = payload;
  console.log('Order paid:', entity.id);
  // Additional processing can be added here
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload) {
  const { entity } = payload;
  console.log('Payment failed:', entity.id);
  // Additional processing can be added here
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(payload) {
  const { entity } = payload;
  console.log('Subscription created:', entity.id);
  // Additional processing can be added here
}

/**
 * Get current subscription status
 */
async function getSubscriptionStatusHandler(req, res) {
  try {
    const userId = req.user.id;
    const status = await getSubscriptionStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      message: error.message
    });
  }
}

module.exports = {
  createOrder: createOrderHandler,
  verifyPayment: verifyPaymentHandler,
  handleWebhook,
  getSubscriptionStatus: getSubscriptionStatusHandler
};