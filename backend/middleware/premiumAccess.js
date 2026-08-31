/**
 * Premium Access Control Middleware
 * Restricts chat and contact features to premium users or accepted interests
 */

const { prisma } = require('../utils/database');

/**
 * Check premium access middleware
 * Allows access if user has active subscription OR accepted interest
 */
async function checkPremiumAccess(req, res, next) {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.userId || req.body.receiverId;

    // Check for active subscription
    const now = new Date();
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE',
        endDate: {
          gte: now
        }
      }
    });

    // If user has active subscription, allow access
    if (activeSubscription) {
      req.hasPremiumAccess = true;
      req.subscription = activeSubscription;
      return next();
    }

    // Check for accepted interest if target user is specified
    if (targetUserId) {
      const acceptedInterest = await prisma.interest.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: targetUserId, status: 'ACCEPTED' },
            { senderId: targetUserId, receiverId: userId, status: 'ACCEPTED' }
          ]
        }
      });

      if (acceptedInterest) {
        req.hasPremiumAccess = true;
        req.interest = acceptedInterest;
        return next();
      }
    }

    // No premium access
    return res.status(403).json({
      error: 'Premium access required',
      message: 'This feature requires a premium subscription or mutual interest acceptance.',
      upgradeUrl: '/subscription'
    });
  } catch (error) {
    console.error('Premium access check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if user has active subscription (helper)
 */
async function hasPremiumAccess(userId, targetUserId = null) {
  const now = new Date();
  
  // Check active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      endDate: { gte: now }
    }
  });

  if (activeSubscription) {
    return { hasAccess: true, type: 'subscription', subscription: activeSubscription };
  }

  // Check for accepted interest
  if (targetUserId) {
    const acceptedInterest = await prisma.interest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId, status: 'ACCEPTED' },
          { senderId: targetUserId, receiverId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (acceptedInterest) {
      return { hasAccess: true, type: 'interest', interest: acceptedInterest };
    }
  }

  return { hasAccess: false };
}

module.exports = {
  checkPremiumAccess,
  hasPremiumAccess
};