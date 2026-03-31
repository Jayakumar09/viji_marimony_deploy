const { prisma } = require('../utils/database');
const sseService = require('../services/sseService');

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
    
    // 2. ALSO log to activity_logs (for frontend Activity Logs UI)
    // Use customId as resourceId if available, otherwise use the internal ID
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
    
    console.log('[ActivityLog] Created in both tables:', { adminId: safeAdminId, action, targetUserId, userCustomId });
  } catch (error) {
    console.error('[ActivityLog] Error:', error.message);
  }
};

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token with correct secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024');
    } catch (err) {
      // Try with fallback secret
      try {
        decoded = jwt.verify(token, 'admin-secret-key');
      } catch (err2) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
    
    if (!decoded || (!decoded.id && !decoded.adminId)) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    // Use either id or adminId from decoded token
    const adminId = decoded.id || decoded.adminId;
    
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error in admin authentication' });
  }
};

// ============ PHOTO VERIFICATION ============

// Get pending photo verifications
const getPendingVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'PENDING' } = req.query;
    const skip = (page - 1) * limit;
    
    const photos = await prisma.photoVerification.findMany({
      where: { status },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            city: true,
            state: true
          }
        }
      }
    });
    
    const total = await prisma.photoVerification.count({
      where: { status }
    });
    
    res.json({
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
};

// Approve photo
const approvePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    
    const photo = await prisma.photoVerification.findUnique({
      where: { id }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await prisma.photoVerification.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });
    
    // Check if all photos for this user are approved
    await checkPhotoVerificationStatus(photo.userId);
    
    // Log the activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PHOTO_APPROVED',
      targetUserId: photo.userId,
      details: {
        photoId: id,
        photoType: photo.photoType,
        previousStatus: photo.status
      },
      req
    });
    
    res.json({ message: 'Photo approved successfully' });

    // Broadcast photo approval to the user
    sseService.broadcastProfileUpdate(photo.userId, ['photoApproved']);
    sseService.broadcastAdminUpdate('photo_approved', { userId: photo.userId, photoId: id });

  } catch (error) {
    console.error('Approve photo error:', error);
    res.status(500).json({ error: 'Failed to approve photo' });
  }
};

// Reject photo
const rejectPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const photo = await prisma.photoVerification.findUnique({
      where: { id }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await prisma.photoVerification.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });
    
    // Log the activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PHOTO_REJECTED',
      targetUserId: photo.userId,
      details: {
        photoId: id,
        photoType: photo.photoType,
        rejectionReason: reason
      },
      req
    });
    
    res.json({ message: 'Photo rejected' });
  } catch (error) {
    console.error('Reject photo error:', error);
    res.status(500).json({ error: 'Failed to reject photo' });
  }
};

// ============ USER MANAGEMENT ============

// Get all users with verification status
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.admin.id;
    
    // DEBUG: Log database connection info
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL (AWS RDS)' : 'SQLite';
    console.log(`[DEBUG getAllUsers] Database type: ${dbType}`);
    console.log(`[DEBUG getAllUsers] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    
    // Build where clause
    let where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    // Status filter
    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          where.isActive = true;
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'verified':
          where.isVerified = true;
          break;
        case 'premium':
          where.isPremium = true;
          break;
        default:
          break;
      }
    }
    
    console.log(`[DEBUG getAllUsers] Query params - page: ${page}, limit: ${limit}, search: '${search}', status: '${status}'`);
    console.log(`[DEBUG getAllUsers] Where clause:`, JSON.stringify(where));
    
    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        country: true,
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        physicalStatus: true,
        drinkingHabit: true,
        smokingHabit: true,
        diet: true,
        profilePhoto: true,
        photos: true,
        bio: true,
        familyValues: true,
        familyType: true,
        familyStatus: true,
        aboutFamily: true,
        isVerified: true,
        isPremium: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        photosVerified: true,
        raasi: true,
        natchathiram: true,
        dhosam: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        fatherName: true,
        fatherOccupation: true,
        fatherCaste: true,
        motherName: true,
        motherOccupation: true,
        motherCaste: true,
        subscriptionTier: true,
        successFee: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        manualVerificationStatus: true,
        profileVerificationStatus: true,
        profileVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`[DEBUG getAllUsers] Raw query returned ${users.length} users`);
    
    const total = await prisma.user.count({ where });
    
    console.log(`[DEBUG getAllUsers] Total count: ${total}`);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
    // Log the activity
    if (users.length > 0) {
      // Log the activity to both tables
      await logAdminActivityToBothTables({
        adminId,
        action: 'VIEW_USER_LIST',
        details: {
          page,
          limit,
          search: search || 'none',
          status: status,
          resultCount: users.length
        },
        req
      });
    }
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Approve/reject user profile manually
const updateUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, photosVerified } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await prisma.user.update({
      where: { id },
      data: {
        isVerified: verified !== undefined ? verified : user.isVerified,
        photosVerified: photosVerified !== undefined ? photosVerified : user.photosVerified
      }
    });
    
    res.json({ message: 'User verification updated' });
  } catch (error) {
    console.error('Update user verification error:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
};

// Quick verify user endpoint
const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin ? req.admin.id : 'system-admin';
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        photosVerified: true
      }
    });
    
    // Log admin activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PROFILE_VERIFICATION_APPROVED',
      targetUserId: id,
      details: {
        userName: `${user.firstName} ${user.lastName}`,
        previousStatus: user.isVerified ? 'Verified' : 'Not Verified',
        newStatus: 'Verified'
      },
      req
    });
    
    res.json({ 
      success: true, 
      message: 'User verified successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true
      }
    });

    // Broadcast user verification to the user
    sseService.broadcastProfileUpdate(id, ['isVerified', 'photosVerified']);
    sseService.broadcastAdminUpdate('user_verified', { userId: id });

  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

// Get full user details
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        subscription: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log the activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'VIEW_USER_PROFILE',
      targetUserId: id,
      details: {
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email
      },
      req
    });
    
    res.json({ user });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// ============ DASHBOARD STATS ============

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { isVerified: true } });
    const pendingPhotoVerifications = await prisma.photoVerification.count({ 
      where: { status: 'PENDING' } 
    });
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    
    res.json({
      totalUsers,
      verifiedUsers,
      pendingPhotoVerifications,
      newUsersToday,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Helper function
const checkPhotoVerificationStatus = async (userId) => {
  const pendingPhotos = await prisma.photoVerification.count({
    where: { userId, status: 'PENDING' }
  });
  
  const rejectedPhotos = await prisma.photoVerification.count({
    where: { userId, status: 'REJECTED' }
  });
  
  const totalPhotos = await prisma.photoVerification.count({
    where: { userId }
  });
  
  // If no pending photos and at least one approved, mark as verified
  if (pendingPhotos === 0 && totalPhotos > 0 && rejectedPhotos < totalPhotos) {
    await prisma.user.update({
      where: { id: userId },
      data: { photosVerified: true }
    });
  }
};

// ============ SUBSCRIPTION MANAGEMENT ============

// Subscription plans configuration
const SUBSCRIPTION_PLANS = [
  { id: 'FREE', name: 'Free', price: 0, duration: 0, successFee: 0 },
  { id: 'BASIC', name: 'Basic', price: 1000, duration: 30, successFee: 25000 },
  { id: 'PRO', name: 'Pro', price: 2000, duration: 90, successFee: 50000 },
  { id: 'PREMIUM', name: 'Premium', price: 5000, duration: 180, successFee: 100000 }
];

// Create or update user subscription
const createSubscription = async (req, res) => {
  try {
    const { userId, plan, paymentId, successFee } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ error: 'User ID and plan are required' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const planConfig = SUBSCRIPTION_PLANS.find(p => p.id === plan.toUpperCase());
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planConfig.duration);
    
    // Create subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: plan.toUpperCase(),
        amount: planConfig.price,
        startDate,
        endDate,
        paymentId: paymentId || 'ADMIN_' + Date.now(),
        successFee: successFee || planConfig.price * 0.1,
        status: 'ACTIVE'
      }
    });
    
    // Sync user table with subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan.toUpperCase(),
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        isPremium: plan.toUpperCase() !== 'FREE',
        successFee: successFee || planConfig.price * 0.1
      }
    });
    
    res.json({
      message: 'Subscription created successfully',
      subscription,
      user: {
        id: user.id,
        subscriptionTier: plan.toUpperCase(),
        isPremium: plan.toUpperCase() !== 'FREE',
        subscriptionStart: startDate,
        subscriptionEnd: endDate
      }
    });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// Sync user subscription status (fixes Premium Member sync issue)
const syncUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for active subscriptions
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    let isPremium = false;
    let subscriptionTier = user.subscriptionTier;
    
    if (activeSubscription) {
      isPremium = true;
      subscriptionTier = activeSubscription.plan.toUpperCase();
      
      // Sync user table
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier,
          subscriptionStart: activeSubscription.startDate,
          subscriptionEnd: activeSubscription.endDate,
          isPremium: true
        }
      });
    } else {
      // No active subscription - check if expired
      if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: false }
        });
      }
    }
    
    res.json({
      message: 'Subscription synced successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium,
        subscriptionTier,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd
      }
    });
    
  } catch (error) {
    console.error('Sync user subscription error:', error);
    res.status(500).json({ error: 'Failed to sync subscription' });
  }
};

// ============ PROFILE VERIFICATION WORKFLOW ============

// Get pending profile verifications (users with email + phone verified, awaiting admin review)
const getPendingProfileVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'Under Admin Review' } = req.query;
    const skip = (page - 1) * limit;
    
    const users = await prisma.user.findMany({
      where: {
        profileVerificationStatus: status,
        emailVerified: true,
        phoneVerified: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        gender: true,
        age: true,
        emailVerified: true,
        phoneVerified: true,
        profileVerificationStatus: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    const total = await prisma.user.count({
      where: {
        profileVerificationStatus: status,
        emailVerified: true,
        phoneVerified: true
      }
    });
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending profile verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending profile verifications' });
  }
};

// Approve profile verification
const approveProfileVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.admin ? req.admin.id : 'system-admin';
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        email: true,
        emailVerified: true, 
        phoneVerified: true,
        profileVerificationStatus: true 
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.emailVerified || !user.phoneVerified) {
      return res.status(400).json({ error: 'User has not completed email and phone verification' });
    }
    
    // Update user profile verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileVerificationStatus: 'Profile Verified',
        profileVerified: true,
        isVerified: true
      }
    });
    
    // Log admin activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PROFILE_VERIFICATION_APPROVED',
      targetUserId: userId,
      details: {
        previousStatus: user.profileVerificationStatus,
        newStatus: 'Profile Verified',
        userName: `${user.firstName} ${user.lastName}`
      },
      req
    });
    
    // Send approval email to user
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@boyarmatrimony.com',
        to: user.email,
        subject: 'Profile Verified - Vijayalakshmi Boyar Matrimony',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Profile Verified! 🎉</h2>
            <p>Dear ${user.firstName},</p>
            <p>Congratulations! Your profile has been verified by our admin team.</p>
            <p>Your profile is now visible to other members, and you can start receiving matches.</p>
            <p>Thank you for choosing Vijayalakshmi Boyar Matrimony!</p>
            <br>
            <p>Best regards,<br>Vijayalakshmi Boyar Matrimony Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError.message);
    }
    
    res.json({
      message: 'Profile verification approved successfully',
      user: {
        id: updatedUser.id,
        profileVerificationStatus: updatedUser.profileVerificationStatus,
        profileVerified: updatedUser.profileVerified
      }
    });
  } catch (error) {
    console.error('Approve profile verification error:', error);
    res.status(500).json({ error: 'Failed to approve profile verification' });
  }
};

// Reject profile verification
const rejectProfileVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        email: true,
        profileVerificationStatus: true 
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user profile verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileVerificationStatus: 'Rejected',
        profileVerified: false,
        isVerified: false,
        manualVerificationNotes: reason || 'Profile verification rejected by admin'
      }
    });
    
    // Log admin activity to both tables
    await logAdminActivityToBothTables({
      adminId,
      action: 'PROFILE_VERIFICATION_REJECTED',
      targetUserId: userId,
      details: {
        previousStatus: user.profileVerificationStatus,
        newStatus: 'Rejected',
        reason: reason,
        userName: `${user.firstName} ${user.lastName}`
      },
      req
    });
    
    // Send rejection email to user
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@boyarmatrimony.com',
        to: user.email,
        subject: 'Profile Verification Update - Vijayalakshmi Boyar Matrimony',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Profile Verification Update</h2>
            <p>Dear ${user.firstName},</p>
            <p>We regret to inform you that your profile verification could not be completed at this time.</p>
            <p><strong>Reason:</strong> ${reason || 'Please contact support for more details.'}</p>
            <p>Please resolve the issue and submit again for verification.</p>
            <br>
            <p>Best regards,<br>Vijayalakshmi Boyar Matrimony Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError.message);
    }
    
    res.json({
      message: 'Profile verification rejected',
      user: {
        id: updatedUser.id,
        profileVerificationStatus: updatedUser.profileVerificationStatus,
        profileVerified: updatedUser.profileVerified
      }
    });
  } catch (error) {
    console.error('Reject profile verification error:', error);
    res.status(500).json({ error: 'Failed to reject profile verification' });
  }
};

module.exports = {
  adminMiddleware,
  getPendingVerifications,
  approvePhoto,
  rejectPhoto,
  getAllUsers,
  updateUserVerification,
  verifyUser,
  getUserDetails,
  getDashboardStats,
  createSubscription,
  syncUserSubscription,
  getPendingProfileVerifications,
  approveProfileVerification,
  rejectProfileVerification
};
