/**
 * Admin Verification Routes
 * Handles ID verification operations for admin users
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Import utilities and middleware
const { encrypt, decrypt } = require('../utils/encryption');
const { maskIdNumber, getLastDigits } = require('../utils/maskUtils');
const { requireAdmin, requirePasswordVerification } = require('../middleware/roleMiddleware');
const { adminAuthMiddleware } = require('../middleware/auth');

// Import AI verification module
const aiVerification = require('../ai-verification');

// Apply authentication and admin middleware to all routes
router.use(adminAuthMiddleware);

/**
 * GET /admin/verifications
 * Get all users with their verification status (masked ID numbers)
 */
router.get('/verifications', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    // Get verifications with user details
    const verifications = await prisma.verification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Get total count
    const total = await prisma.verification.count({ where });

    // Mask ID numbers before sending
    const maskedVerifications = verifications.map(v => ({
      ...v,
      maskedIdNumber: v.last4Digits ? maskIdNumber(v.last4Digits.padStart(8, 'X'), v.idType) : null,
      encryptedIdNumber: undefined // Never send encrypted ID
    }));

    res.json({
      verifications: maskedVerifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

/**
 * GET /admin/verifications/:id
 * Get single verification details (masked ID)
 */
router.get('/verifications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await prisma.verification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
            isVerified: true,
            emailVerified: true,
            phoneVerified: true
          }
        }
      }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Return with masked ID
    res.json({
      ...verification,
      maskedIdNumber: verification.last4Digits 
        ? maskIdNumber(verification.last4Digits.padStart(8, 'X'), verification.idType) 
        : null,
      encryptedIdNumber: undefined // Never send encrypted ID
    });
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({ error: 'Failed to fetch verification' });
  }
});

/**
 * POST /admin/verifications/:id/approve
 * Approve a verification request
 */
router.post('/verifications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const verification = await prisma.verification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Update verification status
    const updated = await prisma.verification.update({
      where: { id },
      data: {
        status: 'APPROVED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        notes: notes || verification.notes
      }
    });

    // Update user's verification status
    await prisma.user.update({
      where: { id: verification.userId },
      data: { isVerified: true }
    });

    res.json({
      message: 'Verification approved successfully',
      verification: {
        ...updated,
        encryptedIdNumber: undefined
      }
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({ error: 'Failed to approve verification' });
  }
});

/**
 * POST /admin/verifications/:id/reject
 * Reject a verification request
 */
router.post('/verifications/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const verification = await prisma.verification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Update verification status
    const updated = await prisma.verification.update({
      where: { id },
      data: {
        status: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
        notes: notes || verification.notes
      }
    });

    res.json({
      message: 'Verification rejected',
      verification: {
        ...updated,
        encryptedIdNumber: undefined
      }
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({ error: 'Failed to reject verification' });
  }
});

/**
 * POST /admin/verifications/:id/reveal
 * Reveal full ID number (requires password verification)
 * Logs the reveal action for audit
 */
router.post('/verifications/:id/reveal', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, reason } = req.body;
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Verify password
    if (!password) {
      return res.status(400).json({ error: 'Password is required to reveal ID number' });
    }

    // Get admin's password hash
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get verification
    const verification = await prisma.verification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (!verification.encryptedIdNumber) {
      return res.status(400).json({ error: 'No ID number stored' });
    }

    // Decrypt ID number
    const decryptedId = decrypt(verification.encryptedIdNumber);

    // Log the reveal action
    await prisma.verificationRevealLog.create({
      data: {
        verificationId: id,
        adminId,
        ipAddress,
        userAgent,
        revealReason: reason || 'No reason provided'
      }
    });

    // Return decrypted ID (temporary access)
    res.json({
      idNumber: decryptedId,
      idType: verification.idType,
      revealedAt: new Date().toISOString(),
      warning: 'This ID number is shown temporarily. Access has been logged.'
    });
  } catch (error) {
    console.error('Reveal ID error:', error);
    res.status(500).json({ error: 'Failed to reveal ID number' });
  }
});

/**
 * GET /admin/verifications/:id/logs
 * Get reveal logs for a verification
 */
router.get('/verifications/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await prisma.verificationRevealLog.findMany({
      where: { verificationId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * POST /admin/verifications/:id/reprocess
 * Reprocess AI verification
 */
router.post('/verifications/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await prisma.verification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Run AI verification again
    const aiResult = await aiVerification.processVerification({
      idImagePath: verification.idImagePath,
      selfiePath: verification.selfiePath,
      idType: verification.idType
    });

    // Update verification with new AI results
    const updated = await prisma.verification.update({
      where: { id },
      data: {
        aiStatus: aiResult.recommendation,
        aiConfidenceScore: aiResult.confidence,
        aiRecommendation: aiResult.recommendation,
        tamperFlag: aiResult.flags?.includes('High tamper risk detected') || false,
        tamperRiskLevel: aiResult.details?.tamperDetection?.riskLevel,
        faceMatchScore: aiResult.details?.faceMatch?.confidence,
        formatValid: aiResult.details?.documentValidation?.details?.formatValid ?? true,
        aiFlags: JSON.stringify(aiResult.flags),
        aiSummary: aiResult.summary,
        aiProcessedAt: new Date()
      }
    });

    res.json({
      message: 'AI verification reprocessed',
      aiResult: {
        recommendation: aiResult.recommendation,
        confidence: aiResult.confidence,
        flags: aiResult.flags,
        summary: aiResult.summary
      },
      verification: {
        ...updated,
        encryptedIdNumber: undefined
      }
    });
  } catch (error) {
    console.error('Reprocess verification error:', error);
    res.status(500).json({ error: 'Failed to reprocess verification' });
  }
});

/**
 * GET /admin/verifications/stats/summary
 * Get verification statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      prisma.verification.count(),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.verification.count({ where: { status: 'APPROVED' } }),
      prisma.verification.count({ where: { status: 'REJECTED' } }),
      prisma.verification.count({ where: { aiRecommendation: 'APPROVE' } }),
      prisma.verification.count({ where: { aiRecommendation: 'REVIEW' } }),
      prisma.verification.count({ where: { aiRecommendation: 'REJECT' } }),
      prisma.verification.count({ where: { tamperFlag: true } })
    ]);

    res.json({
      total: stats[0],
      byStatus: {
        pending: stats[1],
        approved: stats[2],
        rejected: stats[3]
      },
      byAiRecommendation: {
        approve: stats[4],
        review: stats[5],
        reject: stats[6]
      },
      tamperFlags: stats[7]
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /admin/id-types
 * Get supported ID types
 */
router.get('/id-types', (req, res) => {
  const idTypes = aiVerification.getSupportedIdTypes();
  res.json({ idTypes });
});

module.exports = router;
