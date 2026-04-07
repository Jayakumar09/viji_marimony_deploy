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

// Supported ID types for manual verification
const SUPPORTED_ID_TYPES = [
  { type: 'AADHAAR', name: 'Aadhaar Card', format: /^[\d]{12}$/ },
  { type: 'PAN', name: 'PAN Card', format: /^[A-Z]{5}[\d]{4}[A-Z]$/ },
  { type: 'VOTER_ID', name: 'Voter ID', format: /^[A-Z]{3}[\d]{7}$/ },
  { type: 'PASSPORT', name: 'Passport', format: /^[A-Z]{1,2}[\d]{7}$/ },
  { type: 'DRIVING_LICENSE', name: 'Driving License', format: /^[\w]{5,20}$/ }
];

/**
 * Helper function to log admin activity to BOTH tables
 * This ensures activities appear in the frontend Activity Logs UI
 */
const logAdminActivityToBothTables = async ({ adminId, action, targetUserId, details, req }) => {
  try {
    const safeAdminId = adminId || 'system-admin';
    
    // Get admin name for better logging
    let adminName = 'Admin';
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: safeAdminId },
        select: { name: true, email: true }
      });
      if (admin) {
        adminName = admin.name || admin.email || 'Admin';
      }
    } catch (err) {
      // Ignore - use default
    }
    
    // If targetUserId is provided, fetch the user's customId for better logging
    let userCustomId = null;
    let enrichedDetails = details;
    if (targetUserId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { customId: true, firstName: true, lastName: true, email: true, phone: true }
        });
        if (user) {
          userCustomId = user.customId;
          console.log('[ActivityLog] Found user for logging:', { customId: user.customId, name: `${user.firstName} ${user.lastName}` });
          // Enrich details with customId and alternative identifiers if details is an object
          if (details && typeof details === 'object') {
            enrichedDetails = {
              ...details,
              userCustomId: userCustomId || `ID:${targetUserId.substring(0,8)}`,
              userIdentifier: userCustomId || user.email || user.phone || `ID:${targetUserId.substring(0,8)}`
            };
          }
        } else {
          console.log('[ActivityLog] User not found for ID:', targetUserId);
        }
      } catch (err) {
        console.error('[ActivityLog] Error fetching user:', err.message);
      }
    }
    
    const detailsString = typeof enrichedDetails === 'string' ? enrichedDetails : JSON.stringify(enrichedDetails || {});
    const ipAddress = req ? (req.ip || req.connection?.remoteAddress) : null;
    const userAgent = req ? req.get('User-Agent') : null;
    
    // 1. Log to admin_activity_logs (original table)
    try {
      await prisma.adminActivityLog.create({
        data: {
          adminId: safeAdminId,
          action,
          targetUserId,
          details: detailsString,
          ipAddress,
          userAgent
        }
      });
      console.log('[ActivityLog] admin_activity_logs created successfully');
    } catch (logErr) {
      console.error('[ActivityLog] Failed to create admin_activity_logs:', logErr.message);
    }
    
    // 2. ALSO log to activity_logs (for frontend Activity Logs UI)
    // Use customId as resourceId if available, otherwise use the internal ID
    try {
      await prisma.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: safeAdminId,
          actorName: adminName,
          action: action,
          status: 'Success',
          details: detailsString,
          resourceType: targetUserId ? 'USER' : null,
          resourceId: userCustomId || targetUserId || null,
          ipAddress,
          userAgent
        }
      });
      console.log('[ActivityLog] activity_logs created successfully');
    } catch (logErr) {
      console.error('[ActivityLog] Failed to create activity_logs:', logErr.message);
    }
    
    console.log('[ActivityLog] Created in both tables:', { adminId: safeAdminId, action, targetUserId, userCustomId });
  } catch (error) {
    console.error('[ActivityLog] Error:', error.message);
  }
};

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
    const adminId = req.user ? req.user.id : (req.admin ? req.admin.id : 'system-admin');

    const verification = await prisma.verification.findUnique({
      where: { id }
    });

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Get user details for logging
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      select: { firstName: true, lastName: true }
    });

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

    // Log admin activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PROFILE_VERIFICATION_APPROVED',
      targetUserId: verification.userId,
      details: {
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        previousStatus: verification.status,
        newStatus: 'APPROVED'
      },
      req
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

module.exports = router;
